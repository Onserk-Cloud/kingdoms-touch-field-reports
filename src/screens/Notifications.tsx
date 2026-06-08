import { useEffect, useState } from 'react';
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
  type KtNotification,
} from '../lib/notifications';
import { formatDateTime } from '../lib/format';

function titleKey(type: string): string {
  if (type === 'reviewed') return 'notifications.reviewedTitle';
  if (type === 'needs_update') return 'notifications.needsUpdateTitle';
  return 'notifications.newReportTitle';
}

function bodyKey(type: string): string {
  if (type === 'reviewed') return 'notifications.reviewedBody';
  if (type === 'needs_update') return 'notifications.needsUpdateBody';
  return 'notifications.newReportBody';
}

function tint(type: string): string {
  if (type === 'reviewed') return '#1F3D2B';
  if (type === 'needs_update') return '#A04A2E';
  return '#C4984C';
}

export function Notifications() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const me = useSessionStore((s) => s.employee);

  const [items, setItems] = useState<KtNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    void (async () => {
      setLoading(true);
      try {
        setItems(await listNotifications(me.id));
      } finally {
        setLoading(false);
      }
    })();
  }, [me]);

  async function open(n: KtNotification) {
    if (!n.read) {
      await markRead(n.id);
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
      );
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

  const hasUnread = items.some((n) => !n.read);

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar
        title={t('notifications.title')}
        eyebrow={t('notifications.eyebrow')}
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
        {loading && (
          <div
            style={{ textAlign: 'center', color: colors.muted, padding: 24 }}
          >
            {t('common.loading')}
          </div>
        )}
        {!loading && items.length === 0 && (
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
        {items.map((n) => (
          <div
            key={n.id}
            onClick={() => void open(n)}
            className="kt-tap"
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              background: n.read ? '#fff' : 'rgba(196,152,76,0.07)',
              border: `1px solid ${n.read ? colors.line : 'rgba(196,152,76,0.35)'}`,
              borderRadius: 14,
              padding: '13px 14px',
              marginBottom: 10,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: tint(n.type),
                marginTop: 5,
                flexShrink: 0,
                opacity: n.read ? 0.3 : 1,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: colors.charcoal,
                  letterSpacing: -0.1,
                }}
              >
                {t(titleKey(n.type))}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: colors.muted,
                  marginTop: 2,
                  fontWeight: 500,
                  lineHeight: 1.35,
                }}
              >
                {n.refLabel ? `${n.refLabel} — ` : ''}
                {n.type === 'needs_update' && n.note
                  ? n.note
                  : t(bodyKey(n.type))}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.muted,
                  marginTop: 6,
                  fontWeight: 600,
                  opacity: 0.8,
                }}
              >
                {formatDateTime(new Date(n.createdAt).toISOString())}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PhoneFrame>
  );
}
