import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { useSessionStore } from '../store/session';
import {
  listNotifications,
  markAllRead,
  markRead,
  sendTestNotification,
  snoozeNotification,
  type KtNotification,
} from '../lib/notifications';
import { formatDate } from '../lib/format';
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
} from '../lib/push';

function titleKey(type: string): string {
  if (type === 'reviewed') return 'notifications.reviewedTitle';
  if (type === 'needs_update') return 'notifications.needsUpdateTitle';
  if (type === 'case_assigned') return 'notifications.caseAssignedTitle';
  if (type === 'case_needs_changes') return 'notifications.caseNeedsChangesTitle';
  if (type === 'case_due_soon') return 'notifications.caseDueSoonTitle';
  if (type === 'test') return 'notifications.testTitle';
  return 'notifications.newReportTitle';
}

function bodyKey(type: string): string {
  if (type === 'reviewed') return 'notifications.reviewedBody';
  if (type === 'needs_update') return 'notifications.needsUpdateBody';
  if (type === 'case_assigned') return 'notifications.caseAssignedBody';
  if (type === 'case_needs_changes') return 'notifications.caseNeedsChangesBody';
  if (type === 'case_due_soon') return 'notifications.caseDueSoonBody';
  if (type === 'test') return 'notifications.testBody';
  return 'notifications.newReportBody';
}

const NOTE_TYPES = ['needs_update', 'case_needs_changes'];

/** Visual family of a notification — drives the icon tile + card accents. */
type Kind = 'overdue' | 'soon' | 'review' | 'done' | 'assigned';

function kindOf(type: string): Kind {
  if (type === 'case_overdue') return 'overdue';
  if (type === 'case_due_soon') return 'soon';
  // "Changes requested" shares the danger/triangle treatment: it needs action.
  if (NOTE_TYPES.includes(type)) return 'overdue';
  if (type === 'reviewed' || type === 'test') return 'done';
  if (type === 'case_assigned') return 'assigned';
  return 'review'; // new_report + unknown types
}

/** Types that belong under the "Deadlines" section header. */
const DEADLINE_TYPES = ['case_due_soon', 'case_overdue'];

/** Compact relative age: now / 12m / 3h / 2d, then a short date. */
function timeAgo(ts: number, nowLabel: string): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return nowLabel;
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return formatDate(ts);
}

export function Notifications() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const me = useSessionStore((s) => s.employee);

  const [items, setItems] = useState<KtNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pushState, setPushState] = useState<
    'idle' | 'enabling' | 'enabled' | 'denied' | 'unsupported' | 'error'
  >('idle');
  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );

  async function sendTest() {
    if (!me) return;
    setTestState('sending');
    const ok = await sendTestNotification(me.id);
    setTestState(ok ? 'sent' : 'error');
    if (ok) setReloadKey((k) => k + 1);
  }

  useEffect(() => {
    if (!isPushSupported()) {
      setPushState('unsupported');
      return;
    }
    const perm = getPushPermission();
    if (perm === 'granted') setPushState('enabled');
    else if (perm === 'denied') setPushState('denied');
    else setPushState('idle');
  }, []);

  async function enablePush() {
    if (!me) return;
    setPushState('enabling');
    const res = await subscribeToPush(me.id);
    setPushState(
      res.status === 'granted'
        ? 'enabled'
        : res.status === 'denied'
          ? 'denied'
          : res.status === 'unsupported'
            ? 'unsupported'
            : 'error',
    );
  }

  useEffect(() => {
    if (!me) return;
    void (async () => {
      setLoading(true);
      setError(false);
      try {
        setItems(await listNotifications(me.id));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [me, reloadKey]);

  async function open(n: KtNotification) {
    if (!n.read) {
      await markRead(n.id);
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
      );
    }
    if (n.caseId) {
      navigate(`/cases/${n.caseId}`);
      return;
    }
    if (!n.reportId) return;
    const staff = me && me.role !== 'employee';
    navigate(
      staff ? `/supervisor/report/${n.reportId}` : `/report/${n.reportId}`,
    );
  }

  async function clearAll() {
    if (!me) return;
    await markAllRead(me.id);
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
  }

  async function snooze(n: KtNotification) {
    await snoozeNotification(n.id);
    setItems((prev) => prev.filter((x) => x.id !== n.id));
  }

  const hasUnread = items.some((n) => !n.read);

  /** kind → tinted icon tile (40×40, radius 11) with an 18px inline icon. */
  const kindMeta: Record<
    Kind,
    { c: string; bg: string; icon: (c: string) => ReactNode }
  > = {
    overdue: {
      c: colors.danger,
      bg: colors.dangerSoft,
      icon: (c) => (
        <>
          <path
            d="M9 2l7 13H2L9 2z"
            stroke={c}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M9 7v4M9 13h.01"
            stroke={c}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      ),
    },
    soon: {
      c: colors.goldDeep,
      bg: `${colors.gold}24`,
      icon: (c) => (
        <>
          <circle cx="9" cy="9" r="7" stroke={c} strokeWidth="1.6" />
          <path
            d="M9 5v4l3 2"
            stroke={c}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      ),
    },
    review: {
      c: colors.goldDeep,
      bg: `${colors.gold}24`,
      icon: (c) => (
        <>
          <path
            d="M2 9s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
            stroke={c}
            strokeWidth="1.5"
          />
          <circle cx="9" cy="9" r="2" stroke={c} strokeWidth="1.5" />
        </>
      ),
    },
    done: {
      c: colors.forest,
      bg: `${colors.sage}2E`,
      icon: (c) => (
        <path
          d="M3 9.5l3.5 3.5L15 5"
          stroke={c}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    },
    assigned: {
      c: colors.blue,
      bg: colors.blueSoft,
      icon: (c) => (
        <>
          <circle cx="9" cy="6.5" r="2.6" stroke={c} strokeWidth="1.5" />
          <path
            d="M4 14c.8-2.3 2.6-3.5 5-3.5s4.2 1.2 5 3.5"
            stroke={c}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      ),
    },
  };

  const groups = [
    {
      key: 'deadlines',
      labelKey: 'notifications.groupDeadlines',
      items: items.filter((n) => DEADLINE_TYPES.includes(n.type)),
    },
    {
      key: 'updates',
      labelKey: 'notifications.groupUpdates',
      items: items.filter((n) => !DEADLINE_TYPES.includes(n.type)),
    },
  ];

  const alertCount = items.filter((n) => {
    const k = kindOf(n.type);
    return !n.read && (k === 'overdue' || k === 'soon');
  }).length;

  function renderItem(n: KtNotification) {
    const kind = kindOf(n.type);
    const m = kindMeta[kind];
    const alert = kind === 'overdue' || kind === 'soon';
    return (
      <div
        key={n.id}
        onClick={() => void open(n)}
        role="button"
        tabIndex={0}
        aria-label={t(titleKey(n.type))}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void open(n);
          }
        }}
        className="kt-tap"
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          background: n.read ? '#fff' : 'rgba(196,152,76,0.07)',
          border: `1px solid ${
            kind === 'overdue'
              ? colors.dangerLine
              : n.read
                ? colors.line
                : 'rgba(196,152,76,0.35)'
          }`,
          borderRadius: 16,
          padding: 13,
          marginBottom: 9,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: m.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: n.read ? 0.55 : 1,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
          >
            {m.icon(m.c)}
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}
          >
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: colors.charcoal,
                letterSpacing: -0.1,
                lineHeight: 1.3,
              }}
            >
              {t(titleKey(n.type))}
            </span>
            <span
              style={{
                fontSize: 10.5,
                color: colors.muted,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {timeAgo(n.createdAt, t('notifications.timeNow'))}
            </span>
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: colors.muted,
              marginTop: 3,
              fontWeight: 500,
              lineHeight: 1.35,
            }}
          >
            {n.refLabel ? `${n.refLabel} — ` : ''}
            {NOTE_TYPES.includes(n.type) && n.note
              ? n.note
              : t(bodyKey(n.type))}
          </div>
          {alert && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void open(n);
                }}
                className="kt-tap"
                style={{
                  padding: '7px 12px',
                  borderRadius: 9,
                  border: 'none',
                  background: kind === 'overdue' ? colors.danger : colors.forest,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('notifications.openCase')}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void snooze(n);
                }}
                className="kt-tap"
                style={{
                  padding: '7px 12px',
                  borderRadius: 9,
                  background: colors.ivory,
                  color: colors.forest,
                  fontSize: 11,
                  fontWeight: 700,
                  border: `1px solid ${colors.line}`,
                  cursor: 'pointer',
                }}
              >
                {t('notifications.snooze')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar
        title={t('notifications.title')}
        eyebrow={
          alertCount > 0
            ? t('notifications.needAction', { n: alertCount })
            : t('notifications.eyebrow')
        }
        onBack={() => navigate(-1)}
        trailing={
          hasUnread ? (
            <button
              onClick={clearAll}
              className="kt-tap"
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: colors.forest,
                padding: '8px 10px',
                borderRadius: 10,
                background: colors.ivory,
                whiteSpace: 'nowrap',
              }}
            >
              {t('notifications.markAllRead')}
            </button>
          ) : undefined
        }
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
          padding: '16px 20px 40px',
        }}
      >
        {pushState === 'enabled' ? (
          <div
            style={{
              background: 'rgba(143,165,139,0.15)',
              border: '1px solid rgba(143,165,139,0.4)',
              borderRadius: 14,
              padding: '10px 12px',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: colors.forestSoft,
                }}
              >
                ✓ {t('push.enabled')}
              </span>
              <button
                onClick={() => void sendTest()}
                disabled={testState === 'sending'}
                className="kt-tap"
                style={{
                  minHeight: 44,
                  padding: '0 14px',
                  borderRadius: 11,
                  border: `1px solid ${colors.forestSoft}`,
                  background: '#fff',
                  color: colors.forest,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {testState === 'sending'
                  ? t('notifications.testSending')
                  : t('notifications.sendTest')}
              </button>
            </div>
            {testState === 'sent' && (
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: colors.forest,
                  marginTop: 6,
                }}
              >
                {t('notifications.testSent')}
              </div>
            )}
            {testState === 'error' && (
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: colors.danger,
                  marginTop: 6,
                }}
              >
                {t('notifications.testError')}
              </div>
            )}
          </div>
        ) : pushState !== 'unsupported' ? (
          <div
            style={{
              background: '#fff',
              border: `1px solid ${colors.line}`,
              borderRadius: 16,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div
              style={{ fontSize: 14, fontWeight: 700, color: colors.charcoal }}
            >
              {t('push.enableTitle')}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: colors.muted,
                marginTop: 3,
                fontWeight: 500,
                lineHeight: 1.35,
              }}
            >
              {t('push.enableSub')}
            </div>
            {pushState === 'denied' ? (
              <div
                style={{
                  fontSize: 12,
                  color: '#A04A2E',
                  marginTop: 8,
                  fontWeight: 600,
                }}
              >
                {t('push.denied')}
              </div>
            ) : (
              <button
                onClick={() => void enablePush()}
                disabled={pushState === 'enabling'}
                className="kt-tap"
                style={{
                  marginTop: 10,
                  height: 44,
                  padding: '0 16px',
                  borderRadius: 12,
                  background: colors.forest,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                }}
              >
                {pushState === 'enabling'
                  ? t('push.enabling')
                  : t('push.enable')}
              </button>
            )}
            {pushState === 'error' && (
              <div
                style={{
                  fontSize: 12,
                  color: '#A04A2E',
                  marginTop: 8,
                  fontWeight: 600,
                }}
              >
                {t('push.error')}
              </div>
            )}
            <div
              style={{
                fontSize: 11,
                color: colors.muted,
                marginTop: 8,
                fontWeight: 500,
              }}
            >
              {t('push.iosHint')}
            </div>
          </div>
        ) : null}

        {loading && (
          <div
            style={{ textAlign: 'center', color: colors.muted, padding: 24 }}
          >
            {t('common.loading')}
          </div>
        )}
        {!loading && error && (
          <div
            style={{
              padding: 30,
              textAlign: 'center',
              background: colors.dangerSoft,
              borderRadius: 16,
              border: `1px solid ${colors.dangerLine}`,
              color: colors.danger,
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            <div>{t('common.loadError')}</div>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="kt-tap"
              style={{
                marginTop: 14,
                minHeight: 44,
                padding: '0 20px',
                borderRadius: 12,
                fontSize: 13.5,
                fontWeight: 700,
                color: '#fff',
                background: colors.danger,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t('common.retry')}
            </button>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div
            style={{
              padding: 30,
              textAlign: 'center',
              background: '#fff',
              borderRadius: 16,
              border: `1px solid ${colors.line}`,
              color: colors.muted,
              fontSize: 13.5,
              fontWeight: 500,
            }}
          >
            {t('notifications.empty')}
          </div>
        )}
        {!loading &&
          !error &&
          groups.map(
            (g) =>
              g.items.length > 0 && (
                <div key={g.key} style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: colors.goldDeep,
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                      marginBottom: 10,
                      paddingLeft: 2,
                    }}
                  >
                    {t(g.labelKey)}
                  </div>
                  {g.items.map(renderItem)}
                </div>
              ),
          )}
      </div>
    </PhoneFrame>
  );
}
