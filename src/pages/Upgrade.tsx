import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, Plus, Minus, AlertTriangle, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceBilling, formatPlanName } from '@/hooks/useWorkspaceBilling';
import { toast } from 'sonner';

/* ═══════════════════════ Types ═══════════════════════ */

type Plan = {
  name: string;
  monthlyPrice: number | null;
  description: string;
  cta: string;
  ctaStyle: 'primary' | 'outline';
  recommended?: boolean;
  features: string[];
};

type AddOn = { emoji: string; name: string; price: string; unit: string; note?: string };

type CellValue = boolean | string;
type FeatureRow = { label: string; free: CellValue; plus: CellValue; pro: CellValue; business: CellValue; enterprise: CellValue };
type FeatureCategory = { category: string; rows: FeatureRow[] };
type FAQItem = { q: string; a: string };

/* ═══════════════════════ Helpers ═══════════════════════ */

function formatPrice(monthly: number | null, yearly: boolean): string {
  if (monthly === null) return 'Custom';
  if (monthly === 0) return '$0';
  if (yearly) {
    const perMonth = (monthly * 10) / 12;
    return `$${perMonth % 1 === 0 ? perMonth.toFixed(0) : perMonth.toFixed(2)}`;
  }
  return `$${monthly % 1 === 0 ? monthly.toFixed(0) : monthly.toFixed(2)}`;
}

/* ═══════════════════════ Component ═══════════════════════ */

export default function Upgrade() {
  const [yearly, setYearly] = useState(false);
  const { translations: { pricing: tp, common: tc } } = useLanguage();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { ownerId, ownerName, ownerPlan } = useWorkspaceBilling();
  const navigate = useNavigate();

  const isOwner = user?.id === ownerId;

  const handleSelectPlan = () => {
    if (!isOwner) return;
    toast.info(
      tc?.language === 'vi' || document.documentElement.lang === 'vi'
        ? 'Tính năng thanh toán đang được phát triển. Vui lòng quay lại sau!'
        : 'Payment feature is under development. Please come back later!',
      { duration: 4000 }
    );
  };

  const LEFT_PLANS: Plan[] = useMemo(() => [
    { name: tp.plans.free.name, monthlyPrice: 0, description: tp.plans.free.description, cta: tp.plans.free.cta, ctaStyle: 'outline', features: tp.plans.free.features },
    { name: tp.plans.plus.name, monthlyPrice: 4.8, description: tp.plans.plus.description, cta: tp.plans.plus.cta, ctaStyle: 'outline', features: tp.plans.plus.features },
    { name: tp.plans.pro.name, monthlyPrice: 12.0, description: tp.plans.pro.description, cta: tp.plans.pro.cta, ctaStyle: 'primary', recommended: true, features: tp.plans.pro.features },
  ], [tp]);

  const RIGHT_PLANS: Plan[] = useMemo(() => [
    { name: tp.plans.business.name, monthlyPrice: 24.0, description: tp.plans.business.description, cta: tp.plans.business.cta, ctaStyle: 'outline', features: tp.plans.business.features },
    { name: tp.plans.enterprise.name, monthlyPrice: null, description: tp.plans.enterprise.description, cta: tp.plans.enterprise.cta, ctaStyle: 'outline', features: tp.plans.enterprise.features },
  ], [tp]);

  const ADDONS: AddOn[] = useMemo(() => tp.addOns, [tp]);
  const COMPARISON: FeatureCategory[] = useMemo(() => tp.comparisonCategories, [tp]);
  const FAQ_DATA: FAQItem[] = useMemo(() => tp.faqItems, [tp]);

  const PLAN_COLS = useMemo(() => [
    { key: 'free' as const, name: tp.plans.free.name, monthlyPrice: 0, cta: tp.plans.free.cta },
    { key: 'plus' as const, name: tp.plans.plus.name, monthlyPrice: 4.8, cta: tp.plans.plus.cta },
    { key: 'pro' as const, name: tp.plans.pro.name, monthlyPrice: 12.0, cta: tp.plans.pro.cta, primary: true },
    { key: 'business' as const, name: tp.plans.business.name, monthlyPrice: 24.0, cta: tp.plans.business.cta },
    { key: 'enterprise' as const, name: tp.plans.enterprise.name, monthlyPrice: null as number | null, cta: tp.plans.enterprise.cta },
  ], [tp]);

  const essentialsLines = (tp.essentialsLabel as string).split('\n');
  const teamLines = (tp.teamLabel as string).split('\n');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        <span>{tc.back || 'Back'}</span>
      </button>

      {/* Non-owner warning banner */}
      {!isOwner && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {tc?.language === 'vi' || document.documentElement.lang === 'vi'
                ? 'Chỉ Chủ sở hữu không gian làm việc (Owner) mới có quyền nâng cấp.'
                : 'Only the Workspace Owner can upgrade the plan.'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tc?.language === 'vi' || document.documentElement.lang === 'vi'
                ? `Bạn đang sử dụng quyền lợi từ ${ownerName || 'Owner'}.`
                : `You are using benefits from ${ownerName || 'Owner'}.`}
            </p>
          </div>
        </div>
      )}

      {/* Current plan indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Zap className="w-4 h-4" />
        <span>
          {tc?.language === 'vi' || document.documentElement.lang === 'vi'
            ? `Gói hiện tại: ${formatPlanName(ownerPlan)}`
            : `Current plan: ${formatPlanName(ownerPlan)}`}
        </span>
      </div>

      {/* Pricing content — clone of Pricing page */}
      <div style={{
        fontFamily: "'NotionInter', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#37352f',
      }}>
        {/* Hero */}
        <h1 style={{
          fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 700,
          letterSpacing: '-0.035em', lineHeight: 1.12,
          margin: '0 0 32px', textAlign: 'center',
        }} className="text-foreground">
          {tp.heroTitle}
        </h1>

        {/* Toggle row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ToggleBtn active={!yearly} onClick={() => setYearly(false)} label={tp.payMonthly} />
            <ToggleBtn active={yearly} onClick={() => setYearly(true)} label={tp.payYearly} />
            <span className="text-primary text-sm font-medium ml-2">
              {yearly ? tp.yearlySaving : tp.yearlySaveHint}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{tp.priceInUsd}</span>
        </div>

        {/* Section labels */}
        <div className="pricing-section-labels" style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
          <div style={{ flex: '3 1 480px' }}>
            <p className="text-lg font-bold text-foreground">
              {essentialsLines.map((line, i) => (
                <span key={i}>{line}{i < essentialsLines.length - 1 && <br />}</span>
              ))}
            </p>
          </div>
          <div style={{ flex: '2 1 380px' }}>
            <p className="text-lg font-bold text-foreground">
              {teamLines.map((line, i) => (
                <span key={i}>{line}{i < teamLines.length - 1 && <br />}</span>
              ))}
            </p>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="pricing-grid" style={{ display: 'flex', gap: 0 }}>
          <div className="pricing-left" style={{
            flex: '3 1 480px',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            border: '1px solid hsl(var(--border))',
            borderRadius: '10px 0 0 10px',
            borderRight: 'none',
          }}>
            {LEFT_PLANS.map((plan, idx) => (
              <div key={plan.name} style={{
                padding: '24px 22px 28px',
                borderRight: idx < LEFT_PLANS.length - 1 ? '1px solid hsl(var(--border))' : 'none',
              }}>
                <PlanColumn plan={plan} yearly={yearly} tp={tp} disabled={!isOwner} onSelect={handleSelectPlan} />
              </div>
            ))}
          </div>

          <div className="pricing-right" style={{
            flex: '2 1 380px',
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            border: '1.5px solid hsl(var(--primary))',
            borderRadius: '0 10px 10px 0',
            background: 'hsl(var(--primary) / 0.03)',
          }}>
            {RIGHT_PLANS.map((plan, idx) => (
              <div key={plan.name} style={{
                padding: '24px 22px 28px',
                borderRight: idx < RIGHT_PLANS.length - 1 ? '1px solid hsl(var(--border))' : 'none',
              }}>
                <PlanColumn plan={plan} yearly={yearly} tp={tp} disabled={!isOwner} onSelect={handleSelectPlan} />
              </div>
            ))}
          </div>
        </div>

        {/* Add-ons */}
        <div style={{ marginTop: 56, paddingBottom: 72 }}>
          <h2 className="text-lg font-bold text-foreground mb-1">{tp.addOnTitle}</h2>
          <p className="text-sm text-muted-foreground mb-4">{tp.addOnDescription}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            {ADDONS.map(addon => (
              <div key={addon.name} className="p-4 border border-border rounded-lg hover:border-muted-foreground/30 transition-colors">
                <div className="text-sm font-semibold text-foreground mb-1">
                  {addon.emoji} {addon.name}
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-xl font-bold text-foreground">{addon.price}</span>
                  <span className="text-xs text-muted-foreground">{addon.unit}</span>
                </div>
                {addon.note && <p className="text-xs text-muted-foreground leading-relaxed">{addon.note}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Comparison table */}
        <UpgradePlansAndFeatures yearly={yearly} planCols={PLAN_COLS} comparison={COMPARISON} tp={tp} disabled={!isOwner} onSelect={handleSelectPlan} />

        {/* FAQ */}
        <UpgradeQuestionsAndAnswers faqData={FAQ_DATA} tp={tp} />
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 900px) {
          .pricing-grid { flex-direction: column !important; }
          .pricing-left {
            border-radius: 10px 10px 0 0 !important;
            border-right: 1px solid hsl(var(--border)) !important;
            border-bottom: none !important;
          }
          .pricing-right {
            border-radius: 0 0 10px 10px !important;
          }
          .pricing-right, .pricing-left {
            grid-template-columns: 1fr !important;
          }
          .pricing-right > div,
          .pricing-left > div {
            border-right: none !important;
            border-bottom: 1px solid hsl(var(--border));
          }
          .pricing-right > div:last-child,
          .pricing-left > div:last-child {
            border-bottom: none;
          }
          .pricing-section-labels {
            flex-direction: column !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════ Toggle Button ═══════════════════════ */

function ToggleBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded-md border-none cursor-pointer transition-all ${
        active ? 'font-semibold bg-muted text-foreground' : 'font-normal bg-transparent text-muted-foreground'
      }`}
    >
      {label}
    </button>
  );
}

/* ═══════════════════════ Plan Column ═══════════════════════ */

function PlanColumn({ plan, yearly, tp, disabled, onSelect }: { plan: Plan; yearly: boolean; tp: any; disabled: boolean; onSelect: () => void }) {
  const price = formatPrice(plan.monthlyPrice, yearly);
  const isCustom = plan.monthlyPrice === null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center gap-2 mb-2.5 min-h-[24px]">
        <span className="text-base font-semibold text-foreground">{plan.name}</span>
        {plan.recommended && (
          <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
            {tp.recommended}
          </span>
        )}
      </div>

      <div className="min-h-[56px] mb-2 flex items-baseline flex-wrap">
        <span className="text-3xl font-bold text-foreground tracking-tight leading-none">{price}</span>
        {!isCustom && (
          <span className="text-xs text-muted-foreground ml-1.5">
            {tp.perWorkspace} / {yearly ? tp.mo : tp.month}
          </span>
        )}
        {isCustom && (
          <span className="text-xs text-muted-foreground ml-1.5">{tp.customPricing}</span>
        )}
      </div>

      <p className="text-[13px] text-muted-foreground leading-relaxed mb-3.5 min-h-[60px]">
        {plan.description}
      </p>

      <div className="mb-5">
        <button
          onClick={onSelect}
          disabled={disabled}
          className={`w-full py-1.5 px-3.5 text-sm font-medium rounded-lg cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            plan.ctaStyle === 'primary'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-none'
              : 'bg-background text-foreground border border-border hover:bg-accent'
          }`}
        >
          {plan.cta}
        </button>
      </div>

      <p className="text-[13px] font-semibold text-foreground mb-2.5">{tp.includes}</p>

      <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
        {plan.features.map((f: string) => (
          <li key={f} className="flex items-start gap-1.5 text-sm text-foreground leading-relaxed">
            <Check size={15} className="text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ═══════════════════════ Comparison Table ═══════════════════════ */

function CellContent({ value }: { value: CellValue }) {
  if (value === true) return <Check size={16} className="text-primary" strokeWidth={2.5} />;
  if (value === false) return <span className="text-muted-foreground/40 text-sm">—</span>;
  return <span className="text-[13px] text-foreground leading-relaxed">{value}</span>;
}

function UpgradePlansAndFeatures({ yearly, planCols, comparison, tp, disabled, onSelect }: { yearly: boolean; planCols: any[]; comparison: FeatureCategory[]; tp: any; disabled: boolean; onSelect: () => void }) {
  return (
    <div style={{ marginTop: 72, paddingBottom: 48 }}>
      <h2 className="text-2xl font-bold text-foreground mb-8">{tp.comparisonTitle}</h2>

      <table className="comparison-table w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '22%' }} />
          {planCols.map((c: any) => <col key={c.key} style={{ width: '15.6%' }} />)}
        </colgroup>

        <thead>
          <tr>
            <th className="p-4 text-left align-bottom border-b-2 border-border bg-background sticky top-0 z-10" />
            {planCols.map((col: any) => {
              const price = formatPrice(col.monthlyPrice, yearly);
              const isCustom = col.monthlyPrice === null;
              return (
                <th key={col.key} className="p-4 text-left align-bottom border-b-2 border-border bg-background sticky top-0 z-10">
                  <div className="text-sm font-bold text-foreground mb-0.5">{col.name}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {isCustom ? tp.contactUs : <>{price}<span className="font-normal"> / {tp.mo}</span></>}
                  </div>
                  <button
                    onClick={onSelect}
                    disabled={disabled}
                    className={`w-full py-1 px-2.5 text-xs font-medium rounded-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                      col.primary
                        ? 'bg-primary text-primary-foreground border-none hover:bg-primary/90'
                        : 'bg-background text-foreground border border-border hover:bg-accent'
                    }`}
                  >
                    {col.cta}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {comparison.map(cat => (
            <>
              <tr key={`cat-${cat.category}`}>
                <td colSpan={6} className="px-2 pt-6 pb-2 text-[13px] font-bold text-muted-foreground tracking-wide border-b border-border">
                  {cat.category}
                </td>
              </tr>
              {cat.rows.map((row: FeatureRow, rIdx: number) => (
                <tr key={row.label} className={rIdx % 2 === 1 ? 'bg-muted/30' : ''}>
                  <td className="px-2 py-2.5 text-[13px] font-medium text-foreground border-b border-border/50">
                    {row.label}
                  </td>
                  {planCols.map((col: any) => (
                    <td key={col.key} className="px-2 py-2.5 border-b border-border/50 align-middle">
                      <CellContent value={row[col.key as keyof FeatureRow] as CellValue} />
                    </td>
                  ))}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════ FAQ ═══════════════════════ */

function FAQRow({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 border-none bg-transparent cursor-pointer text-left text-foreground text-[15px] font-medium leading-relaxed"
      >
        <span>{item.q}</span>
        {open
          ? <Minus size={18} className="shrink-0 text-muted-foreground ml-4" />
          : <Plus size={18} className="shrink-0 text-muted-foreground ml-4" />}
      </button>
      {open && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {item.a}
        </div>
      )}
    </div>
  );
}

function UpgradeQuestionsAndAnswers({ faqData, tp }: { faqData: FAQItem[]; tp: any }) {
  return (
    <div style={{ marginTop: 48, paddingBottom: 56 }}>
      <h2 className="text-2xl font-bold text-foreground mb-2">{tp.faqTitle}</h2>
      <div className="border-t border-border">
        {faqData.map(item => (
          <FAQRow key={item.q} item={item} />
        ))}
      </div>
      <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
        {tp.faqContact}{' '}
        <a href="mailto:support@t-nexus.com" className="text-primary underline">{tp.faqContactLink}</a>.
      </p>
    </div>
  );
}
