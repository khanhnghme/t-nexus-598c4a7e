import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Check, ArrowLeft, Plus, Minus } from 'lucide-react';
import tNexusLogo from '@/assets/t-nexus-logo.png';
import tNexusText from '@/assets/t-nexus-text.png';

/* ═══════════════════════ Pricing Data ═══════════════════════ */

type Plan = {
  name: string;
  monthlyPrice: number | null;
  description: string;
  cta: string;
  ctaStyle: 'primary' | 'outline';
  recommended?: boolean;
  features: string[];
};

/*
 * Each plan lists the TOTAL features the user receives at that tier.
 * Values are final — e.g. Pro shows "12 projects" not "Free's 1 + Plus's 5 + Pro's 12".
 * No duplication, no "from previous plans" — scan 3 seconds to understand.
 */

const LEFT_PLANS: Plan[] = [
  {
    name: 'Free',
    monthlyPrice: 0,
    description: 'For individuals to organize personal projects and life.',
    cta: 'Sign up',
    ctaStyle: 'outline',
    features: [
      '1 project',
      '100 MB storage',
      '5 members / project',
      'Meetings up to 15 min',
      'Standard support',
    ],
  },
  {
    name: 'Plus',
    monthlyPrice: 1.99,
    description: 'For small teams and professionals to work together.',
    cta: 'Get started',
    ctaStyle: 'outline',
    features: [
      '5 projects',
      '5 GB storage',
      '12 members / project',
      'Meetings up to 60 min',
      'Activity logs (30 days)',
      'Full data export',
      'Priority support (7 days)',
      'Add-ons available',
    ],
  },
  {
    name: 'Pro',
    monthlyPrice: 4.99,
    description: 'For fast-growing teams to maximize productivity.',
    cta: 'Get started',
    ctaStyle: 'primary',
    recommended: true,
    features: [
      '12 projects',
      '25 GB storage',
      '50 members / project',
      'Unlimited meeting time',
      'Unlimited activity logs',
      'Full data export',
      'High-priority support (72h)',
      'Add-ons included, 10% off',
    ],
  },
];

const RIGHT_PLANS: Plan[] = [
  {
    name: 'Business',
    monthlyPrice: 15.0,
    description: 'For mid-to-large organizations to operate at scale.',
    cta: 'Get started',
    ctaStyle: 'outline',
    features: [
      '50 projects',
      '100 GB storage',
      '200 members / project',
      'Unlimited meeting time',
      'Unlimited activity logs',
      'Full data export',
      'Express support (24h)',
      'Add-ons included, 20% off',
    ],
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    description: 'For organizations needing scalability, control, and security.',
    cta: 'Contact Sales',
    ctaStyle: 'outline',
    features: [
      'Unlimited projects',
      'Unlimited storage',
      'Unlimited members',
      'Unlimited meeting time',
      'Enterprise-grade security',
      'Full data export',
      'Dedicated 24/7 support',
      'Custom contracts',
    ],
  },
];

type AddOn = { emoji: string; name: string; price: string; unit: string; note: string };
const ADDONS: AddOn[] = [
  { emoji: '📦', name: 'Storage', price: '$0.99', unit: '/ 5 GB / month', note: 'Pro: ~$0.89 · Business: ~$0.79 per block' },
  { emoji: '👥', name: 'Members', price: '$0.99', unit: '/ 5 members / month', note: 'Pro: 10% off · Business: 20% off' },
];

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
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src={tNexusLogo} alt="T-Nexus" style={{ height: 26, width: 26 }} />
            <img src={tNexusText} alt="T-Nexus" className="hidden sm:block" style={{ height: 16 }} />
          </Link>
          <Link
            to="/"
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
            <span>Back</span>
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
          One platform to power your team.
        </h1>

        {/* Toggle row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ToggleBtn active={!yearly} onClick={() => setYearly(false)} label="Pay monthly" />
            <ToggleBtn active={yearly} onClick={() => setYearly(true)} label="Pay yearly" />
            <span style={{ fontSize: 14, color: '#2383e2', marginLeft: 8, fontWeight: 500 }}>
              {yearly ? "\u{1F389} You're saving 2 months!" : "Save 2 months with yearly"}
            </span>
          </div>
          <span style={{ fontSize: 14, color: '#a5a29a' }}>Price in USD</span>
        </div>

        {/* ── Section labels ── */}
        <div className="pricing-section-labels" style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
          <div style={{ flex: '3 1 480px' }}>
            <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: '#37352f' }}>
              Essentials for<br />staying organized.
            </p>
          </div>
          <div style={{ flex: '2 1 380px' }}>
            <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: '#37352f' }}>
              The workspace for<br />teams that matter.
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
                <PlanColumn plan={plan} yearly={yearly} />
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
                <PlanColumn plan={plan} yearly={yearly} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Add-on Section ── */}
        <div style={{ marginTop: 56, paddingBottom: 72 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#37352f', marginBottom: 4 }}>Add-on pricing</h2>
          <p style={{ fontSize: 14, color: '#a5a29a', marginBottom: 16 }}>Available from Plus plan and above. Billed monthly per workspace.</p>
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
                <p style={{ fontSize: 13, color: '#a5a29a', lineHeight: 1.45, margin: 0 }}>{addon.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Plans and features — full comparison table ── */}
        <PlansAndFeatures yearly={yearly} />

        {/* ── Questions & answers ── */}
        <QuestionsAndAnswers />

      </main>

      {/* ── Footer ── */}
      <PricingFooter />

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
      `}</style>
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

function PlanColumn({ plan, yearly }: { plan: Plan; yearly: boolean }) {
  const price = formatPrice(plan.monthlyPrice, yearly);
  const isCustom = plan.monthlyPrice === null;
  const isFree = plan.monthlyPrice === 0;

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
            Recommended
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
            per workspace / {yearly ? 'mo' : 'month'}
          </span>
        )}
        {isCustom && (
          <span style={{ fontSize: 12, color: '#a5a29a', marginLeft: 6 }}>pricing</span>
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
              background: plan.name === 'Business' || plan.name === 'Enterprise' ? 'rgba(255,255,255,0.8)' : '#fff',
              color: '#37352f',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(55,53,47,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = plan.name === 'Business' || plan.name === 'Enterprise' ? 'rgba(255,255,255,0.8)' : '#fff'; }}
          >
            {plan.cta}
          </button>
        )}
      </div>

      {/* Feature list */}
      <p style={{ fontSize: 13, fontWeight: 600, color: '#37352f', margin: '0 0 10px' }}>
        Includes:
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {plan.features.map(f => (
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

type CellValue = boolean | string;
type FeatureRow = { label: string; free: CellValue; plus: CellValue; pro: CellValue; business: CellValue; enterprise: CellValue };
type FeatureCategory = { category: string; rows: FeatureRow[] };

const COMPARISON: FeatureCategory[] = [
  {
    category: 'Projects & Storage',
    rows: [
      { label: 'Projects',            free: '1',       plus: '5',       pro: '12',      business: '50',      enterprise: 'Unlimited' },
      { label: 'Storage',             free: '100 MB',  plus: '5 GB',    pro: '25 GB',   business: '100 GB',  enterprise: 'Unlimited' },
      { label: 'Members per project', free: '5',       plus: '12',      pro: '50',      business: '200',     enterprise: 'Unlimited' },
    ],
  },
  {
    category: 'Meetings & Communication',
    rows: [
      { label: 'Meeting duration',    free: '15 min',  plus: '60 min',  pro: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
      { label: 'Activity logs',       free: false,     plus: '30 days', pro: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
    ],
  },
  {
    category: 'Data & Tools',
    rows: [
      { label: 'Full data export',    free: false,     plus: true,      pro: true,       business: true,      enterprise: true },
      { label: 'Add-ons',             free: false,     plus: 'Available', pro: 'Included, 10% off', business: 'Included, 20% off', enterprise: 'Custom' },
    ],
  },
  {
    category: 'Support',
    rows: [
      { label: 'Support level',       free: 'Standard', plus: 'Priority (7 days)', pro: 'High-priority (72h)', business: 'Express (24h)', enterprise: 'Dedicated 24/7' },
    ],
  },
  {
    category: 'Security & Compliance',
    rows: [
      { label: 'Enterprise-grade security', free: false, plus: false, pro: false, business: false, enterprise: true },
      { label: 'Custom contracts',          free: false, plus: false, pro: false, business: false, enterprise: true },
    ],
  },
];

const PLAN_COLS: { key: keyof Omit<FeatureRow, 'label'>; name: string; monthlyPrice: number | null; cta: string; primary?: boolean }[] = [
  { key: 'free',       name: 'Free',       monthlyPrice: 0,     cta: 'Sign up' },
  { key: 'plus',       name: 'Plus',       monthlyPrice: 1.99,  cta: 'Get started' },
  { key: 'pro',        name: 'Pro',        monthlyPrice: 4.99,  cta: 'Get started', primary: true },
  { key: 'business',   name: 'Business',   monthlyPrice: 15.0,  cta: 'Get started' },
  { key: 'enterprise', name: 'Enterprise', monthlyPrice: null,   cta: 'Contact Sales' },
];

function CellContent({ value }: { value: CellValue }) {
  if (value === true) return <Check size={16} style={{ color: '#2383e2' }} strokeWidth={2.5} />;
  if (value === false) return <span style={{ color: '#d3d1cb', fontSize: 14 }}>—</span>;
  return <span style={{ fontSize: 13, color: '#37352f', lineHeight: 1.4 }}>{value}</span>;
}

function PlansAndFeatures({ yearly }: { yearly: boolean }) {
  return (
    <div style={{ marginTop: 72, paddingBottom: 48 }}>
      <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#37352f', marginBottom: 32 }}>
        Plans and features
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
          {PLAN_COLS.map(c => <col key={c.key} style={{ width: '15.6%' }} />)}
        </colgroup>

        {/* ── Sticky header ── */}
        <thead>
          <tr>
            <th style={{ padding: '16px 8px', textAlign: 'left', verticalAlign: 'bottom', borderBottom: '2px solid rgba(55,53,47,0.09)', background: '#fff', position: 'sticky', top: 52, zIndex: 10 }} />
            {PLAN_COLS.map(col => {
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
                    {isCustom ? 'Contact us →' : <>{price}<span style={{ fontWeight: 400 }}> / mo</span></>}
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
          {COMPARISON.map(cat => (
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
              {cat.rows.map((row, rIdx) => (
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
                  {PLAN_COLS.map(col => (
                    <td
                      key={col.key}
                      style={{
                        padding: '10px 8px',
                        borderBottom: '1px solid rgba(55,53,47,0.06)',
                        verticalAlign: 'middle',
                      }}
                    >
                      <CellContent value={row[col.key]} />
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

type FAQItem = { q: string; a: string };

const FAQ_DATA: FAQItem[] = [
  { q: 'How is pricing calculated for the paid plans?', a: 'Pricing is per workspace, billed monthly or yearly. Each workspace gets its own plan. You can have multiple workspaces under the same account.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards (Visa, Mastercard, American Express). For Enterprise plans, we also support invoicing and bank transfers.' },
  { q: 'Can I change my plan later?', a: 'Yes! You can upgrade or downgrade your plan at any time from your workspace settings. Upgrades take effect immediately, and downgrades take effect at the end of your current billing period.' },
  { q: 'What happens when I change plans?', a: 'When you upgrade, you will be charged a prorated amount for the remainder of the current billing cycle. When you downgrade, the change takes effect at the end of your billing period.' },
  { q: 'Do you offer student discounts?', a: 'Yes, we offer a 50% discount on Plus and Pro plans for students with a valid .edu email address. Contact our support team to apply.' },
  { q: 'How do I cancel my paid plan?', a: 'You can cancel your subscription at any time from your workspace settings. Your data will remain accessible until the end of the billing period, after which your workspace will revert to the Free plan.' },
  { q: 'What happens if my payment fails?', a: 'We will retry the payment up to 3 times over a 7-day period. If payment continues to fail, your workspace will be downgraded to the Free plan. Your data will be preserved.' },
  { q: 'How do refunds work?', a: 'We offer full refunds within 14 days of your initial purchase. After that, refunds are prorated based on the remaining time in your billing period. Contact support to request a refund.' },
];

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

function QuestionsAndAnswers() {
  return (
    <div style={{ marginTop: 48, paddingBottom: 56 }}>
      <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#37352f', marginBottom: 8 }}>
        Questions & answers
      </h2>
      <div style={{ borderTop: '1px solid rgba(55,53,47,0.09)' }}>
        {FAQ_DATA.map(item => (
          <FAQRow key={item.q} item={item} />
        ))}
      </div>
      <p style={{ marginTop: 20, fontSize: 14, color: '#787774', lineHeight: 1.6 }}>
        Still have more questions?{' '}
        <a href="mailto:support@t-nexus.com" style={{ color: '#2383e2', textDecoration: 'underline' }}>Contact our support team</a>.
      </p>
    </div>
  );
}

/* ═══════════════════════ Footer ═══════════════════════ */

function PricingFooter() {
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
                  T-Nexus platform
                </p>
                <img src={tNexusText} alt="T-Nexus" style={{ height: 36, objectFit: 'contain', objectPosition: 'left' }} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#787774' }}>
              More than task management. This is the teamwork operating system for students, leaders and projects that demand real transparency.
            </p>
          </div>

          {/* Links Grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
            {/* Product */}
            <div style={{ minWidth: 120 }}>
              <div style={headingStyle}>Product</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Link to="/" style={linkStyle}>Task Management</Link>
                <Link to="/" style={linkStyle}>Scoring</Link>
                <Link to="/" style={linkStyle}>AI Assistant</Link>
                <Link to="/" style={linkStyle}>Public Sharing</Link>
              </div>
            </div>

            {/* Resources */}
            <div style={{ minWidth: 120 }}>
              <div style={headingStyle}>Resources</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <a href="#" style={linkStyle}>Product Demo</a>
                <a href="#" style={linkStyle}>Efficiency</a>
                <a href="#" style={linkStyle}>Reviews</a>
              </div>
            </div>

            {/* Contact */}
            <div style={{ minWidth: 120 }}>
              <div style={headingStyle}>Contact</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <a href="mailto:support@t-nexus.io.vn" style={linkStyle}>support@t-nexus.io.vn</a>
                <Link to="/auth" style={linkStyle}>Log in</Link>
                <Link to="/download" style={linkStyle}>Install app</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(55,53,47,0.09)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#a5a29a' }}>
          <span>© {new Date().getFullYear()} T-Nexus. <span style={{ fontStyle: 'italic' }}>Developed by Team-Nexus</span>. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
