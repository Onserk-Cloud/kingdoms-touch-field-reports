import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { useSessionStore } from '../store/session';
import type { Role } from '../lib/types';

/**
 * In-app user manual. Shows only the sections relevant to the signed-in
 * role, plus a download link to the full branded PDF (per language).
 */

interface Section {
  key: string;
  roles: Role[] | 'all';
}

const SECTIONS: Section[] = [
  { key: 'install', roles: 'all' },
  { key: 'loginPin', roles: ['employee'] },
  { key: 'loginStaff', roles: ['supervisor', 'admin', 'super_admin'] },
  { key: 'create', roles: ['employee'] },
  { key: 'changes', roles: ['employee'] },
  { key: 'review', roles: ['supervisor', 'admin', 'super_admin'] },
  { key: 'manage', roles: ['admin', 'super_admin'] },
  { key: 'faq', roles: 'all' },
  { key: 'trouble', roles: 'all' },
];

export function Help() {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const me = useSessionStore((s) => s.employee);
  const role: Role = me?.role ?? 'employee';

  const visible = SECTIONS.filter(
    (s) => s.roles === 'all' || s.roles.includes(role),
  );
  const pdfHref =
    locale === 'es' ? '/docs/manual-es.pdf' : '/docs/manual-en.pdf';

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar
        title={t('help.title')}
        eyebrow={t('help.eyebrow')}
        onBack={() => navigate(-1)}
      />
      <div
        className="kt-scroll"
        style={{
          position: 'absolute',
          top: 110,
          bottom: 0,
          left: 0,
          right: 0,
          overflow: 'auto',
          padding: '18px 20px 40px',
        }}
      >
        {/* Download full PDF */}
        <a
          href={pdfHref}
          download
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: colors.forest,
            borderRadius: 16,
            padding: '14px 16px',
            marginBottom: 18,
            textDecoration: 'none',
          }}
          className="kt-tap"
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              flexShrink: 0,
              background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldDeep} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 16h12"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff' }}>
              {t('help.downloadPdf')}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: 'rgba(255,255,255,0.75)',
                marginTop: 2,
                fontWeight: 500,
                lineHeight: 1.35,
              }}
            >
              {t('help.downloadSub')}
            </div>
          </div>
        </a>

        {visible.map((s) => {
          const steps = t(`help.${s.key}Steps`).split('\n');
          return (
            <div
              key={s.key}
              style={{
                background: '#fff',
                borderRadius: 18,
                border: `1px solid ${colors.line}`,
                padding: '16px 16px 10px',
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontFamily: 'Cinzel, Georgia, serif',
                  fontSize: 16,
                  fontWeight: 600,
                  color: colors.forest,
                  marginBottom: 10,
                }}
              >
                {t(`help.${s.key}`)}
              </div>
              {steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      flexShrink: 0,
                      background: colors.gold,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: colors.charcoal,
                      fontWeight: 500,
                      lineHeight: 1.45,
                    }}
                  >
                    {step}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </PhoneFrame>
  );
}
