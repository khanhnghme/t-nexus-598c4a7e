import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { TNexusLogo } from '@/components/TNexusLogo';
import LanguageToggle from '@/components/LanguageToggle';
import { ArrowLeft, Shield, ChevronRight, Menu, X, Clock } from 'lucide-react';
import { format, type Locale as DateLocale } from 'date-fns';
import { vi as viLocale, enUS } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { POLICY_CONTENT_EN, POLICY_CONTENT_VI } from '@/lib/i18n/policyContent';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const items: TocItem[] = [];
  const idCounts = new Map<string, number>();

  for (const line of lines) {
    const trimmed = line.trim();
    let level: 2 | 3 | null = null;
    let text = '';

    if (trimmed.startsWith('### ')) {
      level = 3;
      text = trimmed.slice(4).trim();
    } else if (trimmed.startsWith('## ')) {
      level = 2;
      text = trimmed.slice(3).trim();
    }

    if (level && text) {
      const cleanText = text.replace(/[*_`~]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      let baseId = slugify(cleanText);
      if (!baseId) baseId = `section-${items.length}`;
      const count = idCounts.get(baseId) || 0;
      idCounts.set(baseId, count + 1);
      const id = count === 0 ? baseId : `${baseId}-${count}`;
      items.push({ id, text: cleanText, level });
    }
  }
  return items;
}

function injectHeadingIds(markdown: string, toc: TocItem[]): string {
  let tocIdx = 0;
  return markdown
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (
        (trimmed.startsWith('## ') || trimmed.startsWith('### ')) &&
        tocIdx < toc.length
      ) {
        const item = toc[tocIdx];
        tocIdx++;
        const hashes = trimmed.startsWith('### ') ? '###' : '##';
        const text = trimmed.slice(hashes.length + 1);
        return `${hashes} <span id="${item.id}"></span>${text}`;
      }
      return line;
    })
    .join('\n');
}

/* ------------------------------------------------------------------ */
/*  Hardcoded Policy Content                                           */
/* ------------------------------------------------------------------ */

const POLICY_UPDATED_AT = '2026-04-07T16:00:00+07:00';


/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Terms() {
  const { translations, locale, localizedPath: lp } = useLanguage();
  const policyContent = locale === 'vi' ? POLICY_CONTENT_VI : POLICY_CONTENT_EN;
  const navigate = useNavigate();
  const tp = translations.terms ?? {};
  const dateLocale: DateLocale = locale === 'vi' ? viLocale : enUS;

  /* --- State --- */
  const [activeId, setActiveId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  /* --- Derive TOC and enriched markdown --- */
  const toc = useMemo(() => extractToc(policyContent), [policyContent]);
  const enrichedMarkdown = useMemo(
    () => injectHeadingIds(policyContent, toc),
    [policyContent, toc],
  );

  /* --- Intersection Observer for active heading --- */
  useEffect(() => {
    if (!contentRef.current || toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 },
    );

    const timer = setTimeout(() => {
      toc.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) observer.observe(el);
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [toc, enrichedMarkdown]);

  /* --- Smooth scroll handler --- */
  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveId(id);
      setSidebarOpen(false);
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fafaf8',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ═══ Top header bar ═══ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e8e5e0',
          padding: '0 24px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#37352f',
            }}
            className="policy-mobile-toggle"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <button
            onClick={() => navigate(lp('/'))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#37352f',
              fontSize: 14,
              fontWeight: 500,
              padding: 0,
            }}
          >
            <ArrowLeft size={16} />
            <span>{tp.backHome || 'Back'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LanguageToggle />
          <TNexusLogo variant="text" width={80} />
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* ═══ Sidebar navigation ═══ */}
        <aside
          className={`policy-sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{
            width: 280,
            minWidth: 280,
            position: 'sticky',
            top: 56,
            height: 'calc(100vh - 56px)',
            overflowY: 'auto',
            borderRight: '1px solid #e8e5e0',
            background: '#ffffff',
            padding: '24px 0',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '0 20px 16px',
              borderBottom: '1px solid #f0ede8',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#37352f',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              <Shield size={16} style={{ color: '#2383e2' }} />
              {tp.sidebarTitle || 'System Policy'}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#9b9a97',
                fontSize: 11,
              }}
            >
              <Clock size={11} />
              {tp.lastUpdated || 'Updated'}{' '}
              {format(new Date(POLICY_UPDATED_AT), 'dd/MM/yyyy', { locale: dateLocale })}
            </div>
          </div>

          {/* TOC items */}
          <nav style={{ padding: '0 8px' }}>
            {toc.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                  border: 'none',
                  background: activeId === item.id ? 'rgba(35,131,226,0.06)' : 'transparent',
                  color: activeId === item.id ? '#2383e2' : '#37352f',
                  fontWeight: activeId === item.id ? 600 : 400,
                  fontSize: 13,
                  textAlign: 'left',
                  padding: item.level === 3 ? '6px 12px 6px 32px' : '7px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  lineHeight: 1.4,
                }}
                onMouseEnter={(e) => {
                  if (activeId !== item.id) {
                    e.currentTarget.style.background = 'rgba(55,53,47,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeId !== item.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {item.level === 2 && (
                  <ChevronRight
                    size={12}
                    style={{
                      color: activeId === item.id ? '#2383e2' : '#c4c3bf',
                      flexShrink: 0,
                    }}
                  />
                )}
                <span style={{ lineHeight: 1.4 }}>{item.text}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="policy-sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              top: 56,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 39,
            }}
          />
        )}

        {/* ═══ Main content ═══ */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: '40px 48px 80px',
            maxWidth: 860,
          }}
          id="policy-main-content"
        >
          <div>
            {/* Last updated notice */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                marginBottom: 24,
                background: 'rgba(35,131,226,0.04)',
                border: '1px solid rgba(35,131,226,0.12)',
                borderRadius: 8,
                fontSize: 13,
                color: '#6b6b6b',
              }}
            >
              <Clock size={14} style={{ color: '#2383e2', flexShrink: 0 }} />
              <span>
                {locale === 'vi'
                  ? `Chính sách được cập nhật lần cuối vào ngày ${format(new Date(POLICY_UPDATED_AT), "dd/MM/yyyy 'lúc' HH:mm", { locale: dateLocale })}`
                  : `Policy last updated on ${format(new Date(POLICY_UPDATED_AT), "MMMM d, yyyy 'at' HH:mm", { locale: dateLocale })}`}
              </span>
            </div>
            <div
              ref={contentRef}
              className="policy-markdown-content"
              style={{ color: '#37352f', lineHeight: 1.7 }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {enrichedMarkdown}
              </ReactMarkdown>
            </div>
          </div>
        </main>
      </div>

      {/* ═══ Footer ═══ */}
      <footer
        style={{
          borderTop: '1px solid #e8e5e0',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          fontSize: 12,
          color: '#9b9a97',
        }}
      >
        <span>© {new Date().getFullYear()} T-Nexus</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={12} />
          <span>{tp.footerNote || 'Please read the terms carefully before using the system.'}</span>
        </div>
      </footer>

      {/* ═══ Styles ═══ */}
      <style>{`
        .policy-markdown-content h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 24px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e8e5e0;
          color: #37352f;
          letter-spacing: -0.02em;
        }
        .policy-markdown-content h2 {
          font-size: 22px;
          font-weight: 650;
          margin: 40px 0 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f0ede8;
          color: #37352f;
          letter-spacing: -0.01em;
          scroll-margin-top: 90px;
        }
        .policy-markdown-content h3 {
          font-size: 17px;
          font-weight: 600;
          margin: 28px 0 10px;
          color: #37352f;
          scroll-margin-top: 90px;
        }
        .policy-markdown-content p {
          margin: 0 0 14px;
          font-size: 15px;
          color: #37352f;
        }
        .policy-markdown-content ul, .policy-markdown-content ol {
          margin: 0 0 14px;
          padding-left: 24px;
        }
        .policy-markdown-content li {
          margin-bottom: 6px;
          font-size: 15px;
          color: #37352f;
        }
        .policy-markdown-content li::marker {
          color: #c4c3bf;
        }
        .policy-markdown-content strong {
          font-weight: 600;
          color: #37352f;
        }
        .policy-markdown-content a {
          color: #2383e2;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .policy-markdown-content blockquote {
          border-left: 3px solid #2383e2;
          padding: 8px 16px;
          margin: 16px 0;
          background: rgba(35,131,226,0.04);
          border-radius: 0 6px 6px 0;
          color: #37352f;
        }
        .policy-markdown-content code {
          background: rgba(135,131,120,0.1);
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 14px;
          color: #eb5757;
        }
        .policy-markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 14px;
        }
        .policy-markdown-content th, .policy-markdown-content td {
          border: 1px solid #e8e5e0;
          padding: 8px 12px;
          text-align: left;
        }
        .policy-markdown-content th {
          background: #f7f6f3;
          font-weight: 600;
        }
        .policy-markdown-content hr {
          border: none;
          border-top: 1px solid #e8e5e0;
          margin: 32px 0;
        }

        .policy-markdown-content h2 span[id],
        .policy-markdown-content h3 span[id] {
          scroll-margin-top: 90px;
        }

        @media (max-width: 860px) {
          .policy-mobile-toggle {
            display: flex !important;
          }
          .policy-sidebar {
            position: fixed !important;
            left: -300px;
            top: 56px !important;
            height: calc(100vh - 56px) !important;
            z-index: 40;
            transition: left 0.25s ease;
            box-shadow: none;
          }
          .policy-sidebar.open {
            left: 0;
            box-shadow: 4px 0 24px rgba(0,0,0,0.1);
          }
          .policy-markdown-content h1 { font-size: 26px; }
          .policy-markdown-content h2 { font-size: 19px; }
          main { padding: 24px 20px 60px !important; }
        }

        .policy-sidebar::-webkit-scrollbar {
          width: 4px;
        }
        .policy-sidebar::-webkit-scrollbar-track {
          background: transparent;
        }
        .policy-sidebar::-webkit-scrollbar-thumb {
          background: #d3d1cb;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
