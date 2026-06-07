import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { PrimaryButton, SecondaryButton } from '../components/Button';
import { Badge } from '../components/Badge';
import { useTheme } from '../theme-context';
import { ktStore } from '../lib/offline-store';
import { formatTime, shortReportId } from '../lib/format';
import type { OfflineReport } from '../lib/types';
import { useI18n } from '../lib/i18n';

export function Success() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<OfflineReport | null>(null);
  const [photoCount, setPhotoCount] = useState(0);

  useEffect(() => {
    void (async () => {
      // Try by local id first
      let r = await ktStore.getReport(id);
      if (!r) {
        // Fallback: find by remote id
        const all = await ktStore.listReports();
        r = all.find((x) => x.remoteId === id);
      }
      if (r) {
        setReport(r);
        const photos = await ktStore.listPhotos(r.id);
        setPhotoCount(photos.length);
      }
    })();
  }, [id]);

  return (
    <PhoneFrame bg={colors.ivory}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '70px 24px 40px',
          display: 'flex',
          flexDirection: 'column',
        }}
        className="kt-safe-top kt-safe-bottom"
      >
        <div
          style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}
        >
          <div
            style={{
              width: 132,
              height: 132,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(201,162,77,0.18) 0%, transparent 70%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 16,
                borderRadius: '50%',
                border: `1px dashed ${colors.gold}`,
                opacity: 0.6,
              }}
            />
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldDeep} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  '0 12px 28px rgba(201,162,77,0.35), inset 0 2px 0 rgba(255,255,255,0.4)',
                animation: 'kt-pop 0.6s ease-out',
              }}
            >
              <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
                <path
                  d="M9 22l8 8 16-18"
                  stroke="#fff"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.goldDeep,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {t('success.eyebrow', {
              id: shortReportId(report?.remoteId ?? id),
            })}
          </div>
          <div
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: 30,
              fontWeight: 500,
              color: colors.charcoal,
              letterSpacing: -0.5,
              lineHeight: 1.15,
              marginTop: 8,
            }}
          >
            {t('success.titleLine1')}
            <br />
            {t('success.titleLine2')}
          </div>
          <div
            style={{
              fontSize: 14,
              color: colors.muted,
              marginTop: 10,
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            {t('success.subtitleLine1')}
            <br />
            {t('success.subtitleLine2')}
          </div>
        </div>

        <div
          style={{
            marginTop: 22,
            background: '#fff',
            borderRadius: 18,
            padding: 16,
            border: `1px solid ${colors.line}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: colors.charcoal,
              }}
            >
              {report?.jobType ?? t('success.fieldReport')}
            </div>
            <Badge
              kind={report?.status === 'submitted' ? 'submitted' : 'pending'}
            />
          </div>
          <div
            style={{
              height: 1,
              background: colors.line,
              margin: '12px 0',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {[
              { label: t('common.photos'), value: String(photoCount) },
              {
                label: t('success.gps'),
                value: report?.gps ? t('success.gpsCaptured') : '—',
              },
              {
                label: t('success.time'),
                value: report ? formatTime(report.createdAt) : '—',
              },
            ].map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: colors.muted,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: colors.forest,
                    marginTop: 3,
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <PrimaryButton onClick={() => navigate('/new-report')}>
          {t('success.createAnother')}
        </PrimaryButton>
        <div style={{ height: 10 }} />
        <SecondaryButton onClick={() => navigate('/home')}>
          {t('success.backToHome')}
        </SecondaryButton>
      </div>
      <style>{`
        @keyframes kt-pop {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </PhoneFrame>
  );
}
