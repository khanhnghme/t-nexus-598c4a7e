import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Check, ArrowLeft, Plus, Minus } from 'lucide-react';
import tNexusLogo from '@/assets/t-nexus-logo.png';
import tNexusText from '@/assets/t-nexus-text.png';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

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

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const { translations: t, localizedPath: lp } = useLanguage();
  const tp = t.pricing;
  const tc = t.common;

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

  // Parse section labels (may contain \n for line breaks)
  const essentialsLines = (tp.essentialsLabel as string).split('\n');
  const teamLines = (tp.teamLabel as string).split('\n');

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: "'NotionInter', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: '#37352f',
    }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(55,53,47,0.09)',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <Link to={lp('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src={tNexusLogo} alt="T-Nexus" style={{ height: 26, width: 26 }} />
            <img src={tNexusText} alt="T-Nexus" className="hidden sm:block" style={{ height: 16 }} />
          </Link>
          <Link
            to={lp('/')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 14, color: '#787774', textDecoration: 'none',
              padding: '5px 12px', borderRadius: 6,
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(55,53,47,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ArrowLeft size={14} />
            <span>{tc.back}</span>
          </Link>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px 0' }}>

        {/* Hero */}
        <h1 style={{
          fontSize: 'clamp(30px, 4.2vw, 48px)', fontWeight: 700,
          letterSpacing: '-0.035em', lineHeight: 1.12,
          color: '#37352f', margin: '0 0 40px', textAlign: 'center',
        }}>
          {tp.heroTitle}
        </h1>

        {/* Toggle row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ToggleBtn active={!yearly} onClick={() => setYearly(false)} label={tp.payMonthly} />
            <ToggleBtn active={yearly} onClick={() => setYearly(true)} label={tp.payYearly} />
            <span style={{ fontSize: 14, color: '#2383e2', marginLeft: 8, fontWeight: 500 }}>
              {yearly ? tp.yearlySaving : tp.yearlySaveHint}
            </span>
          </div>
          <span style={{ fontSize: 14, color: '#a5a29a' }}>{tp.priceInUsd}</span>
        </div>

        {/* ── Section labels ── */}
        <div className="pricing-section-labels" style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
          <div style={{ flex: '3 1 480px' }}>
            <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: '#37352f' }}>
              {essentialsLines.map((line, i) => (
                <span key={i}>{line}{i < essentialsLines.length - 1 && <br />}</span>
              ))}
            </p>
          </div>
          <div style={{ flex: '2 1 380px' }}>
            <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: '#37352f' }}>
              {teamLines.map((line, i) => (
                <span key={i}>{line}{i < teamLines.length - 1 && <br />}</span>
              ))}
            </p>
          </div>
        </div>

        {/* ── Plan Cards ── */}
        <div className="pricing-grid" style={{ display: 'flex', gap: 0 }}>

          {/* Left section — Free, Plus, Pro */}
          <div
            className="pricing-left"
            style={{
              flex: '3 1 480px',
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              border: '1px solid rgba(55,53,47,0.09)',
              borderRadius: '10px 0 0 10px',
              borderRight: 'none',
            }}
          >
            {LEFT_PLANS.map((plan, idx) => (
              <div key={plan.name} style={{
                padding: '24px 22px 28px',
                borderRight: idx < LEFT_PLANS.length - 1 ? '1px solid rgba(55,53,47,0.09)' : 'none',
              }}>
                <PlanColumn plan={plan} yearly={yearly} tp={tp} />
              </div>
            ))}
          </div>

          {/* Right section — Business, Enterprise (light blue bg) */}
          <div
            className="pricing-right"
            style={{
              flex: '2 1 380px',
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              border: '1.5px solid #2383e2',
              borderRadius: '0 10px 10px 0',
              background: 'rgba(35,131,226,0.025)',
            }}
          >
            {RIGHT_PLANS.map((plan, idx) => (
              <div key={plan.name} style={{
                padding: '24px 22px 28px',
                borderRight: idx < RIGHT_PLANS.length - 1 ? '1px solid rgba(55,53,47,0.09)' : 'none',
              }}>
                <PlanColumn plan={plan} yearly={yearly} tp={tp} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Add-on Section ── */}
        <div style={{ marginTop: 56, paddingBottom: 72 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#37352f', marginBottom: 4 }}>{tp.addOnTitle}</h2>
          <p style={{ fontSize: 14, color: '#a5a29a', marginBottom: 16 }}>{tp.addOnDescription}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            {ADDONS.map(addon => (
              <div
                key={addon.name}
                style={{
                  padding: '14px 18px',
                  border: '1px solid rgba(55,53,47,0.09)',
                  borderRadius: 8,
                  transition: 'border-color 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(55,53,47,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(55,53,47,0.09)'; }}
              >
                <div style={{ fontSize: 15, fontWeight: 600, color: '#37352f', marginBottom: 4 }}>
                  {addon.emoji} {addon.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#37352f' }}>{addon.price}</span>
                  <span style={{ fontSize: 13, color: '#a5a29a' }}>{addon.unit}</span>
                </div>
                {addon.note && <p style={{ fontSize: 13, color: '#a5a29a', lineHeight: 1.45, margin: 0 }}>{addon.note}</p>}
              </div>
            ))}
          </div>
          {tp.addOnNote && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(35,131,226,0.05)', borderRadius: 8, border: '1px solid rgba(35,131,226,0.1)' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#2383e2', fontWeight: 500 }}>
                {tp.addOnNote}
              </p>
            </div>
          )}
        </div>

        {/* ── Plans and features — full comparison table ── */}
        <PlansAndFeatures yearly={yearly} planCols={PLAN_COLS} comparison={COMPARISON} tp={tp} />

        {/* ── Questions & answers ── */}
        <QuestionsAndAnswers faqData={FAQ_DATA} tp={tp} />

      </main>

      {/* ── Footer ── */}
      <PricingFooter tp={tp} tc={tc} lp={lp} />

      {/* ── Responsive ── */}
      <style>{`
        @media (max-width: 900px) {
          .pricing-grid { flex-direction: column !important; }
          .pricing-left {
            border-radius: 10px 10px 0 0 !important;
            border-right: 1px solid rgba(55,53,47,0.09) !important;
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
            border-bottom: 1px solid rgba(55,53,47,0.09);
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
      `}
      </style>
    </div>
  );
}

/* ═══════════════════════ Toggle Button ═══════════════════════ */

function ToggleBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', fontSize: 14,
        fontWeight: active ? 600 : 400,
        borderRadius: 6, border: 'none', cursor: 'pointer',
        background: active ? 'rgba(55,53,47,0.08)' : 'transparent',
        color: active ? '#37352f' : '#a5a29a',
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  );
}

/* ═══════════════════════ Plan Column ═══════════════════════ */

function PlanColumn({ plan, yearly, tp }: { plan: Plan; yearly: boolean; tp: any }) {
  const price = formatPrice(plan.monthlyPrice, yearly);
  const isCustom = plan.monthlyPrice === null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Name + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, minHeight: 24 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#37352f' }}>{plan.name}</span>
        {plan.recommended && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#2383e2',
            background: '#e8f0fc', padding: '2px 8px', borderRadius: 4,
          }}>
            {tp.recommended}
          </span>
        )}
      </div>

      {/* Price line — fixed height so buttons align */}
      <div style={{ minHeight: 56, marginBottom: 8, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: '#37352f', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {price}
        </span>
        {!isCustom && (
          <span style={{ fontSize: 12, color: '#a5a29a', marginLeft: 6 }}>
            {tp.perWorkspace} / {yearly ? tp.mo : tp.month}
          </span>
        )}
        {isCustom && (
          <span style={{ fontSize: 12, color: '#a5a29a', marginLeft: 6 }}>{tp.customPricing}</span>
        )}
      </div>

      {/* Description — exactly 3 lines allowance so buttons align perfectly */}
      <p style={{ fontSize: 13, color: '#787774', lineHeight: 1.5, margin: '0 0 14px', minHeight: 60 }}>
        {plan.description}
      </p>

      {/* CTA — sits at consistent position */}
      <div style={{ marginBottom: 20 }}>
        {plan.ctaStyle === 'primary' ? (
          <button
            style={{
              width: '100%', padding: '7px 14px', fontSize: 14, fontWeight: 500,
              border: 'none', borderRadius: 8, cursor: 'pointer',
              background: '#2383e2', color: '#fff',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1b6ec0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#2383e2'; }}
          >
            {plan.cta}
          </button>
        ) : (
          <button
            style={{
              width: '100%', padding: '7px 14px', fontSize: 14, fontWeight: 500,
              border: '1px solid rgba(55,53,47,0.16)',
              borderRadius: 8, cursor: 'pointer',
              background: plan.name === tp.plans.business.name || plan.name === tp.plans.enterprise.name ? 'rgba(255,255,255,0.8)' : '#fff',
              color: '#37352f',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(55,53,47,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = plan.name === tp.plans.business.name || plan.name === tp.plans.enterprise.name ? 'rgba(255,255,255,0.8)' : '#fff'; }}
          >
            {plan.cta}
          </button>
        )}
      </div>

      {/* Feature list */}
      <p style={{ fontSize: 13, fontWeight: 600, color: '#37352f', margin: '0 0 10px' }}>
        {tp.includes}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {plan.features.map((f: string) => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 14, color: '#37352f', lineHeight: 1.4 }}>
            <Check size={15} style={{ color: '#2383e2', flexShrink: 0, marginTop: 2 }} strokeWidth={2.5} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ═══════════════════════ Plans & Features Table ═══════════════════════ */

function CellContent({ value }: { value: CellValue }) {
  if (value === true) return <Check size={16} style={{ color: '#2383e2' }} strokeWidth={2.5} />;
  if (value === false) return <span style={{ color: '#d3d1cb', fontSize: 14 }}>—</span>;
  return <span style={{ fontSize: 13, color: '#37352f', lineHeight: 1.4 }}>{value}</span>;
}

function PlansAndFeatures({ yearly, planCols, comparison, tp }: { yearly: boolean; planCols: any[]; comparison: FeatureCategory[]; tp: any }) {
  return (
    <div style={{ marginTop: 72, paddingBottom: 48 }}>
      <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#37352f', marginBottom: 32 }}>
        {tp.comparisonTitle}
      </h2>

      <table
        className="comparison-table"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}
      >
        {/* Fluid column sizing: label ~22%, each plan ~15.6% */}
        <colgroup>
          <col style={{ width: '22%' }} />
          {planCols.map((c: any) => <col key={c.key} style={{ width: '15.6%' }} />)}
        </colgroup>

        {/* ── Sticky header ── */}
        <thead>
          <tr>
            <th style={{ padding: '16px 8px', textAlign: 'left', verticalAlign: 'bottom', borderBottom: '2px solid rgba(55,53,47,0.09)', background: '#fff', position: 'sticky', top: 52, zIndex: 10 }} />
            {planCols.map((col: any) => {
              const price = formatPrice(col.monthlyPrice, yearly);
              const isCustom = col.monthlyPrice === null;
              return (
                <th
                  key={col.key}
                  style={{
                    padding: '16px 8px 14px',
                    textAlign: 'left',
                    verticalAlign: 'bottom',
                    borderBottom: '2px solid rgba(55,53,47,0.09)',
                    background: '#fff',
                    position: 'sticky',
                    top: 52,
                    zIndex: 10,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#37352f', marginBottom: 2 }}>{col.name}</div>
                  <div style={{ fontSize: 12, color: '#787774', marginBottom: 8 }}>
                    {isCustom ? tp.contactUs : <>{price}<span style={{ fontWeight: 400 }}> / {tp.mo}</span></>}
                  </div>
                  <button
                    style={{
                      padding: '4px 10px', fontSize: 12, fontWeight: 500, borderRadius: 6, cursor: 'pointer',
                      border: col.primary ? 'none' : '1px solid rgba(55,53,47,0.16)',
                      background: col.primary ? '#2383e2' : '#fff',
                      color: col.primary ? '#fff' : '#37352f',
                      transition: 'background 0.12s',
                      width: '100%',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.cta}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {comparison.map(cat => (
            <>
              <tr key={`cat-${cat.category}`}>
                <td
                  colSpan={6}
                  style={{
                    padding: '24px 8px 8px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#787774',
                    letterSpacing: '0.01em',
                    borderBottom: '1px solid rgba(55,53,47,0.09)',
                  }}
                >
                  {cat.category}
                </td>
              </tr>
              {cat.rows.map((row: FeatureRow, rIdx: number) => (
                <tr
                  key={row.label}
                  style={{ background: rIdx % 2 === 1 ? 'rgba(55,53,47,0.024)' : 'transparent' }}
                >
                  <td style={{
                    padding: '10px 8px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#37352f',
                    borderBottom: '1px solid rgba(55,53,47,0.06)',
                  }}>
                    {row.label}
                  </td>
                  {planCols.map((col: any) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '10px 8px',
                        borderBottom: '1px solid rgba(55,53,47,0.06)',
                        verticalAlign: 'middle',
                      }}
                    >
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

/* ═══════════════════════ Questions & Answers ═══════════════════════ */

function FAQRow({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ borderBottom: '1px solid rgba(55,53,47,0.09)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0', border: 'none', background: 'transparent', cursor: 'pointer',
          textAlign: 'left', color: '#37352f', fontSize: 15, fontWeight: 500, lineHeight: 1.4,
        }}
      >
        <span>{item.q}</span>
        {open
          ? <Minus size={18} style={{ flexShrink: 0, color: '#787774', marginLeft: 16 }} />
          : <Plus size={18} style={{ flexShrink: 0, color: '#787774', marginLeft: 16 }} />}
      </button>
      {open && (
        <div style={{ paddingBottom: 16, fontSize: 14, color: '#787774', lineHeight: 1.65 }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

function QuestionsAndAnswers({ faqData, tp }: { faqData: FAQItem[]; tp: any }) {
  return (
    <div style={{ marginTop: 48, paddingBottom: 56 }}>
      <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#37352f', marginBottom: 8 }}>
        {tp.faqTitle}
      </h2>
      <div style={{ borderTop: '1px solid rgba(55,53,47,0.09)' }}>
        {faqData.map(item => (
          <FAQRow key={item.q} item={item} />
        ))}
      </div>
      <p style={{ marginTop: 20, fontSize: 14, color: '#787774', lineHeight: 1.6 }}>
        {tp.faqContact}{' '}
        <a href="mailto:support@t-nexus.com" style={{ color: '#2383e2', textDecoration: 'underline' }}>{tp.faqContactLink}</a>.
      </p>
    </div>
  );
}

/* ═══════════════════════ Footer ═══════════════════════ */

function PricingFooter({ tp, tc, lp }: { tp: any; tc: any; lp: (path: string) => string }) {
  const linkStyle: React.CSSProperties = {
    fontSize: 13, color: '#787774', textDecoration: 'none', lineHeight: 2,
    transition: 'color 0.12s',
  };
  const headingStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: '#37352f', marginBottom: 12, lineHeight: 2,
  };

  return (
    <footer style={{ borderTop: '1px solid rgba(55,53,47,0.09)', background: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 32px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 64, justifyContent: 'space-between', marginBottom: 48 }}>
          
          {/* Brand & Description */}
          <div style={{ flex: '1 1 340px', maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <img src={tNexusLogo} alt="T-Nexus icon" style={{ height: 56, width: 56 }} />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32em', color: '#a5a29a' }}>
                  {tc.tNexusPlatform}
                </p>
                <img src={tNexusText} alt="T-Nexus" style={{ height: 36, objectFit: 'contain', objectPosition: 'left' }} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#787774' }}>
              {tc.footerDescription}
            </p>
          </div>

          {/* Links Grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
            {/* Product */}
            <div style={{ minWidth: 120 }}>
              <div style={headingStyle}>{tp.footerProduct}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {tp.footerProductLinks.map((label: string) => (
                  <Link key={label} to={lp('/')} style={linkStyle}>{label}</Link>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div style={{ minWidth: 120 }}>
              <div style={headingStyle}>{tp.footerResources}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {tp.footerResourceLinks.map((label: string) => (
                  <a key={label} href="#" style={linkStyle}>{label}</a>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div style={{ minWidth: 120 }}>
              <div style={headingStyle}>{tp.footerContact}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <a href="mailto:support@t-nexus.io.vn" style={linkStyle}>support@t-nexus.io.vn</a>
                {tp.footerContactLinks.map((label: string, i: number) => (
                  <Link key={label} to={lp(i === 0 ? '/auth' : '/download')} style={linkStyle}>{label}</Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(55,53,47,0.09)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#a5a29a' }}>
          <span>{tc.copyright} <span style={{ fontStyle: 'italic' }}>{tc.developedBy}</span>. {tc.allRightsReserved}</span>
          <LanguageToggle />
        </div>
      </div>
    </footer>
  );
}
