/**
 * Shared branded email HTML builder for T-Nexus
 * Used by signup-email-otp and password-reset-otp edge functions
 */

const BRAND_PRIMARY = "#2b4acb"; // hsl(228, 63%, 43%)
const BRAND_TEAL = "#006b6b"; // hsl(183, 100%, 21%)
const BRAND_TEAL_LIGHT = "#008f8f";
const BRAND_BG = "#f0f2f5";
const BRAND_CARD = "#ffffff";
const BRAND_TEXT = "#1a1f2e";
const BRAND_MUTED = "#71717a";
const BRAND_SUBTLE = "#a1a1aa";
const LOGO_URL = "https://t-nexus.lovable.app/lovable-uploads/f2f37fb6-e870-4731-8f1b-75fc2da9d498.png";

interface EmailOptions {
  title: string;
  subtitle: string;
  otpCode: string;
  expiryText: string;
  warningText: string;
  ignoreText: string;
}

export function buildBrandedOtpEmail(options: EmailOptions): string {
  const { title, subtitle, otpCode, expiryText, warningText, ignoreText } = options;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="vi" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND_BG};font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${BRAND_BG};padding:32px 16px;">
    <tr><td align="center">

      <!-- Main Card -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;background-color:${BRAND_CARD};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header with gradient -->
        <tr>
          <td style="background:linear-gradient(135deg, ${BRAND_TEAL} 0%, ${BRAND_PRIMARY} 100%);padding:32px 40px;text-align:center;">
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
              <tr>
                <td style="padding-right:12px;vertical-align:middle;">
                  <img src="${LOGO_URL}" alt="T-Nexus" width="36" height="36" style="display:block;border:0;border-radius:8px;" />
                </td>
                <td style="vertical-align:middle;">
                  <span style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">T-Nexus</span>
                </td>
              </tr>
            </table>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:13px;font-weight:400;">
              ${subtitle}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 32px;">
            <!-- Title -->
            <h1 style="margin:0 0 6px;color:${BRAND_TEXT};font-size:20px;font-weight:700;line-height:1.3;">
              ${title}
            </h1>
            <p style="margin:0 0 28px;color:${BRAND_MUTED};font-size:14px;line-height:1.6;">
              ${expiryText}
            </p>

            <!-- OTP Code Box -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr><td align="center" style="padding:0 0 28px;">
                <div style="display:inline-block;background:linear-gradient(135deg, ${BRAND_BG} 0%, #e8edf5 100%);border:2px solid #d4d8e8;border-radius:16px;padding:24px 48px;">
                  <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:${BRAND_PRIMARY};font-family:'Courier New',monospace;display:block;text-align:center;">${otpCode}</span>
                </div>
              </td></tr>
            </table>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr><td style="padding:0 0 20px;">
                <div style="height:1px;background:linear-gradient(to right, transparent, #e4e4e7, transparent);"></div>
              </td></tr>
            </table>

            <!-- Warning -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background-color:#fef9ee;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;">
                  <table cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="vertical-align:top;padding-right:10px;font-size:16px;">🔒</td>
                      <td>
                        <p style="margin:0;color:#92400e;font-size:12px;line-height:1.6;font-weight:500;">
                          ${warningText}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Ignore text -->
            <p style="margin:20px 0 0;color:${BRAND_SUBTLE};font-size:12px;text-align:center;line-height:1.5;">
              ${ignoreText}
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background-color:#fafbfc;border-top:1px solid #f0f0f0;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="text-align:center;">
                  <p style="margin:0 0 4px;color:${BRAND_MUTED};font-size:11px;font-weight:500;">
                    T-Nexus · The night shift for your teamwork
                  </p>
                  <p style="margin:0;color:${BRAND_SUBTLE};font-size:10px;">
                    &copy; ${year} T-Nexus. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>

      <!-- Sub-footer -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;margin-top:16px;">
        <tr>
          <td style="text-align:center;">
            <p style="margin:0;color:${BRAND_SUBTLE};font-size:10px;line-height:1.5;">
              Email này được gửi tự động từ hệ thống T-Nexus.<br/>
              Vui lòng không trả lời email này.
            </p>
          </td>
        </tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`;
}
