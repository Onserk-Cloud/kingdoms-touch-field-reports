import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { TabBar } from '../components/TabBar';
import { LogoMark } from '../components/LogoMark';
import { BellIcon } from '../components/Icons';
import { useTheme } from '../theme-context';
import { useSessionStore } from '../store/session';
import { ktStore } from '../lib/offline-store';
import { useUnreadCount } from '../lib/notifications';
import { formatDateLong } from '../lib/format';
import { useI18n } from '../lib/i18n';

export function Home() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const employee = useSessionStore((s) => s.employee);
  const unread = useUnreadCount();
  const [online, setOnline] = useState(navigator.onLine);
  const [counts, setCounts] = useState({
    today: 0,
    pending: 0,
    week: 0,
    total: 0,
  });

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (!employee) return;
    void (async () => {
      const all = await ktStore.listReports(employee.id);
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      setCounts({
        total: all.length,
        today: all.filter((r) => now - r.createdAt < dayMs).length,
        week: all.filter((r) => now - r.createdAt < dayMs * 7).length,
        pending: all.filter((r) => r.status === 'pending').length,
      });
    })();
  }, [employee]);

  const greeting = t(greetingKeyByHour());
  const dateLabel = formatDateLong(Date.now());

  return (
    <PhoneFrame bg={colors.ivory}>
      {/* Header band */}
      <div
        style={{
          background: colors.forest,
          color: '#fff',
          padding: '62px 24px 36px',
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          position: 'relative',
          overflow: 'hidden',
        }}
        className="kt-safe-top"
      >
        <div
          style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(196,152,76,0.22) 0%, transparent 65%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogoMark variant="white" size={24} />
            <span
              style={{
                fontFamily: 'Cinzel, Georgia, serif',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1.4,
                color: '#fff',
              }}
            >
              KINGDOMS TOUCH
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 10px',
                borderRadius: 999,
                background: online
                  ? 'rgba(143,165,139,0.25)'
                  : 'rgba(196,152,76,0.20)',
                border: `1px solid ${online ? 'rgba(143,165,139,0.45)' : 'rgba(196,152,76,0.45)'}`,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: online ? '#7FD692' : colors.gold,
                  boxShadow: online
                    ? '0 0 6px #7FD692'
                    : '0 0 6px rgba(196,152,76,0.8)',
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
                {online ? t('common.online') : t('common.offline')}
              </span>
            </div>
            <button
              onClick={() => navigate('/notifications')}
              aria-label={t('home.notifications')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
              className="kt-tap"
            >
              <BellIcon color="#fff" size={18} />
              {unread > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    borderRadius: 999,
                    background: colors.gold,
                    color: colors.forest,
                    fontSize: 10,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1.5px solid ${colors.forest}`,
                  }}
                >
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </div>
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: colors.goldSoft,
            letterSpacing: 0.4,
          }}
        >
          {greeting},
        </div>
        <div
          style={{
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: -0.4,
            marginTop: 2,
          }}
        >
          {employee?.name ?? t('home.fieldTech')}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          {t('home.dateLocation', { date: dateLabel })}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '22px 20px 110px' }}>
        <div
          onClick={() => navigate('/new-report')}
          className="kt-tap"
          style={{
            background: '#fff',
            borderRadius: 22,
            padding: 18,
            border: `1px solid ${colors.line}`,
            boxShadow: '0 6px 20px rgba(31,61,43,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: -22,
            position: 'relative',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              flexShrink: 0,
              background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldDeep} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect
                x="5"
                y="3"
                width="16"
                height="20"
                rx="2.5"
                stroke="#fff"
                strokeWidth="1.8"
              />
              <path
                d="M9 10h8M9 14h8M9 18h5"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle
                cx="20"
                cy="22"
                r="4.5"
                fill={colors.forest}
                stroke="#fff"
                strokeWidth="1.5"
              />
              <path
                d="M18 22h4M20 20v4"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: colors.charcoal,
                letterSpacing: -0.2,
              }}
            >
              {t('home.startNewReport')}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: colors.muted,
                marginTop: 2,
                fontWeight: 500,
              }}
            >
              {t('home.startNewReportSub')}
            </div>
          </div>
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
            <path
              d="M1 1l7 6-7 6"
              stroke={colors.forest}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {[
            {
              n: counts.today,
              label: t('home.statSubmittedToday'),
              color: colors.forest,
            },
            {
              n: counts.pending,
              label: t('home.statAwaitingSync'),
              color: colors.gold,
            },
            {
              n: counts.week,
              label: t('home.statThisWeek'),
              color: colors.sage,
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                padding: '14px 12px',
                background: '#fff',
                borderRadius: 14,
                border: `1px solid ${colors.line}`,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: s.color,
                  fontFamily: 'Cinzel, Georgia, serif',
                  letterSpacing: -0.3,
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: colors.muted,
                  marginTop: 2,
                  letterSpacing: 0.2,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 22,
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.goldDeep,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {t('home.workspace')}
          </div>
        </div>

        {[
          {
            title: t('home.rowMyReports'),
            meta: t('home.rowMyReportsMeta', { n: counts.total }),
            icon: 'reports' as const,
            to: '/my-reports',
          },
          {
            title: t('home.rowDraftsOffline'),
            meta: t('home.rowDraftsOfflineMeta', { n: counts.pending }),
            icon: 'offline' as const,
            highlight: counts.pending > 0,
            to: '/my-reports',
          },
        ].map((row) => (
          <div
            key={row.title}
            onClick={() => navigate(row.to)}
            className="kt-tap"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 14px',
              background: '#fff',
              borderRadius: 16,
              marginBottom: 10,
              border: `1px solid ${colors.line}`,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                flexShrink: 0,
                background: row.highlight
                  ? 'rgba(196,152,76,0.14)'
                  : colors.ivoryDeep,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: row.highlight ? colors.goldDeep : colors.forest,
              }}
            >
              {row.icon === 'reports' && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect
                    x="3"
                    y="3"
                    width="13"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M6 7h7M6 10h7M6 13h4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {row.icon === 'offline' && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M3 12a7 7 0 0114 0M6 12a4 4 0 018 0"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <circle cx="10" cy="14" r="1.5" fill="currentColor" />
                  <path
                    d="M2 2l16 16"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: colors.charcoal,
                  letterSpacing: -0.1,
                }}
              >
                {row.title}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: colors.muted,
                  marginTop: 2,
                  fontWeight: 500,
                }}
              >
                {row.meta}
              </div>
            </div>
            <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
              <path
                d="M1 1l6 5-6 5"
                stroke={colors.muted}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ))}
      </div>
      <TabBar active="home" />
    </PhoneFrame>
  );
}

function greetingKeyByHour(): string {
  const h = new Date().getHours();
  if (h < 12) return 'home.greetingMorning';
  if (h < 18) return 'home.greetingAfternoon';
  return 'home.greetingEvening';
}
