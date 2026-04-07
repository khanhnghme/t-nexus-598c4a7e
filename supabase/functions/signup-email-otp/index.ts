import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildBrandedOtpEmail } from "../_shared/email-html-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_URL = "https://api.resend.com";
const FROM_EMAIL = "T-Nexus <noreply@t-nexus.io.vn>";

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildSignupOtpHtml(otpCode: string): string {
  return buildBrandedOtpEmail({
    title: "Xác minh tài khoản",
    subtitle: "Hệ thống quản lý dự án nhóm",
    otpCode,
    expiryText: 'Sử dụng mã bên dưới để xác minh email của bạn. Mã có hiệu lực trong <strong>5 phút</strong>.',
    warningText: '<strong>Không chia sẻ mã này cho bất kỳ ai.</strong> T-Nexus sẽ không bao giờ yêu cầu bạn cung cấp mã OTP qua tin nhắn hay điện thoại.',
    ignoreText: 'Nếu bạn không yêu cầu tạo tài khoản, vui lòng bỏ qua email này.',
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, email, user_id, code } = body;

    // ===== REGISTER (create user without session) =====
    if (action === "register") {
      const { student_id, full_name, password, institution } = body;
      if (!email || !student_id || !full_name || !password) {
        return jsonResponse({ error: "Missing required fields" }, 400);
      }

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("student_id", student_id)
        .maybeSingle();

      if (existingProfile) {
        return jsonResponse({ error: "MSSV đã tồn tại trong hệ thống." }, 409);
      }

      const { data: existingEmailProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (existingEmailProfile) {
        return jsonResponse({ error: "Email đã được sử dụng." }, 409);
      }

      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: false,
        user_metadata: { student_id, full_name, institution: institution || null },
      });

      if (createError) {
        console.error("Create user error:", createError);
        const msg = createError.message?.toLowerCase() || "";
        if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
          return jsonResponse({ error: "Email đã được sử dụng." }, 409);
        }
        return jsonResponse({ error: "Không thể tạo tài khoản. Vui lòng thử lại." }, 500);
      }

      const newUserId = userData.user.id;

      supabase
        .from("demo_passwords")
        .upsert({ user_id: newUserId, plain_password: password }, { onConflict: "user_id" })
        .then(() => {});

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase.from("email_verification_codes").insert({
        user_id: newUserId,
        email: email.toLowerCase(),
        code: otpCode,
        expires_at: expiresAt,
      });

      const emailRes = await fetch(`${RESEND_API_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email.toLowerCase()],
          subject: `Mã xác minh tài khoản T-Nexus: ${otpCode}`,
          html: buildSignupOtpHtml(otpCode),
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Resend error:", errText);
      }

      return jsonResponse({
        success: true,
        user_id: newUserId,
        message: "Tài khoản đã được tạo. Mã xác minh đã gửi đến email.",
      });
    }

    // ===== SEND CODE =====
    if (action === "send_code") {
      if (!email || !user_id) {
        return jsonResponse({ error: "Email and user_id are required" }, 400);
      }

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase
        .from("email_verification_codes")
        .update({ used: true })
        .eq("email", email.toLowerCase())
        .eq("used", false);

      await supabase.from("email_verification_codes").insert({
        user_id,
        email: email.toLowerCase(),
        code: otpCode,
        expires_at: expiresAt,
      });

      const emailRes = await fetch(`${RESEND_API_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email.toLowerCase()],
          subject: `Mã xác minh tài khoản T-Nexus: ${otpCode}`,
          html: buildSignupOtpHtml(otpCode),
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Resend error:", errText);
        return jsonResponse({ error: "Không thể gửi email xác minh. Vui lòng thử lại sau." }, 500);
      }

      return jsonResponse({ success: true, message: "Mã xác minh đã được gửi đến email của bạn" });
    }

    // ===== VERIFY CODE =====
    if (action === "verify_code") {
      if (!email || !code || !user_id) {
        return jsonResponse({ error: "Email, code and user_id are required" }, 400);
      }

      const { data: codeData } = await supabase
        .from("email_verification_codes")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!codeData) {
        return jsonResponse({ error: "Mã xác minh đã hết hạn hoặc không tồn tại. Vui lòng gửi lại mã mới." }, 400);
      }

      if (codeData.attempts >= 5) {
        await supabase
          .from("email_verification_codes")
          .update({ used: true })
          .eq("id", codeData.id);
        return jsonResponse({ error: "Đã nhập sai quá 5 lần. Vui lòng gửi lại mã mới.", max_attempts: true }, 400);
      }

      if (codeData.code !== code) {
        await supabase
          .from("email_verification_codes")
          .update({ attempts: codeData.attempts + 1 })
          .eq("id", codeData.id);
        const remaining = 4 - codeData.attempts;
        return jsonResponse({
          error: `Mã xác minh không đúng. Còn ${remaining} lần thử.`,
          remaining_attempts: remaining,
        }, 400);
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user_id,
        { email_confirm: true }
      );

      if (updateError) {
        console.error("Failed to confirm user:", updateError);
        return jsonResponse({ error: "Không thể xác minh tài khoản" }, 500);
      }

      await supabase
        .from("email_verification_codes")
        .update({ used: true })
        .eq("id", codeData.id);

      return jsonResponse({ success: true, verified: true });
    }

    // ===== RESEND CODE =====
    if (action === "resend_code") {
      if (!email || !user_id) {
        return jsonResponse({ error: "Email and user_id are required" }, 400);
      }

      const { data: lastCode } = await supabase
        .from("email_verification_codes")
        .select("created_at")
        .eq("email", email.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastCode) {
        const elapsed = Date.now() - new Date(lastCode.created_at).getTime();
        if (elapsed < 60000) {
          const wait = Math.ceil((60000 - elapsed) / 1000);
          return jsonResponse({
            error: `Vui lòng chờ ${wait} giây trước khi gửi lại mã.`,
            wait_seconds: wait,
          }, 429);
        }
      }

      await supabase
        .from("email_verification_codes")
        .update({ used: true })
        .eq("email", email.toLowerCase())
        .eq("used", false);

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase.from("email_verification_codes").insert({
        user_id,
        email: email.toLowerCase(),
        code: otpCode,
        expires_at: expiresAt,
      });

      const emailRes = await fetch(`${RESEND_API_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email.toLowerCase()],
          subject: `Mã xác minh tài khoản T-Nexus: ${otpCode}`,
          html: buildSignupOtpHtml(otpCode),
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Resend resend_code error:", errText);
        return jsonResponse({ error: "Không thể gửi lại email xác minh." }, 500);
      }

      return jsonResponse({ success: true, message: "Mã xác minh mới đã được gửi" });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("signup-email-otp error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
