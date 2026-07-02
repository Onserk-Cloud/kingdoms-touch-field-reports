import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { PrimaryButton } from '../components/Button';
import { PhotoTile } from '../components/PhotoTile';
import { CheckIcon } from '../components/Icons';
import { useTheme } from '../theme-context';
import { useDraftStore } from '../store/draft';
import { useSessionStore } from '../store/session';
import { ktStore } from '../lib/offline-store';
import { uploadReport } from '../lib/uploader';
import { formatDateTime, formatGps } from '../lib/format';
import { useI18n } from '../lib/i18n';

export function Review() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const draft = useDraftStore();
  const employee = useSessionStore((s) => s.employee);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Row = ({
    label,
    value,
    mono,
    last,
  }: {
    label: string;
    value: string;
    mono?: boolean;
    last?: boolean;
  }) => (
    <div
      style={{
        padding: '12px 0',
        borderBottom: last ? 'none' : `1px solid ${colors.line}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: colors.muted,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          width: 96,
          flexShrink: 0,
          paddingTop: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: 600,
          color: colors.charcoal,
          fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'Manrope',
          letterSpacing: mono ? 0.2 : -0.1,
          lineHeight: 1.4,
        }}
      >
        {value}
      </div>
    </div>
  );

  const submit = async () => {
    if (!employee) return;
    setBusy(true);
    setError(null);
    try {
      // 1. Save the draft to IndexedDB.
      const localId = await ktStore.saveDraft({
        employeeId: employee.id,
        jobType: draft.jobType,
        location: draft.location,
        description: draft.description,
        notes: draft.notes,
        gps: draft.gps,
        completionConfirmed: draft.completionConfirmed,
      });
      // 2. Save photos.
      for (const p of draft.photos) {
        await ktStore.addPhoto(localId, p.blob);
      }
      // 3. Queue for upload.
      await ktStore.queueReport(localId);

      // 4. Attempt immediate upload if online.
      let remoteId = localId;
      if (navigator.onLine) {
        // Claim the report as 'syncing' so a concurrent auto-flush (which only
        // picks 'pending') can't upload it a second time → no duplicates.
        await ktStore.setStatus(localId, 'syncing');
        try {
          const report = await ktStore.getReport(localId);
          const photos = await ktStore.listPhotos(localId);
          if (report) {
            const rid = await uploadReport(report, photos);
            await ktStore.markSubmitted(localId, rid);
            remoteId = rid;
          } else {
            await ktStore.setStatus(localId, 'pending');
          }
        } catch (err) {
          // Revert to 'pending' so it stays queued and retries when online.
          await ktStore.setStatus(localId, 'pending');
          console.warn('[KT] upload deferred', err);
        }
      }

      // 5. Clean up draft + navigate.
      draft.reset();
      navigate(`/success/${remoteId}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('review.submitFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar title={t('review.title')} eyebrow={t('review.eyebrow')} />

      <div
        className="kt-scroll"
        style={{
          position: 'absolute',
          top: 124,
          bottom: 0,
          left: 0,
          right: 0,
          overflow: 'auto',
          padding: '18px 20px 40px',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 22,
            padding: 18,
            border: `1px solid ${colors.line}`,
            boxShadow: '0 6px 18px rgba(31,61,43,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                flexShrink: 0,
                background: colors.forest,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M5 4h12v14H5z"
                  stroke={colors.gold}
                  strokeWidth="1.6"
                />
                <path
                  d="M8 8h6M8 11h6M8 14h4"
                  stroke={colors.gold}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'Fraunces, Georgia, serif',
                  fontSize: 20,
                  fontWeight: 500,
                  color: colors.charcoal,
                  letterSpacing: -0.3,
                  lineHeight: 1.2,
                }}
              >
                {draft.jobType || t('review.untitledJob')}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: colors.muted,
                  marginTop: 2,
                  fontWeight: 500,
                }}
              >
                {draft.location || '—'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <Row
              label={t('review.labelEmployee')}
              value={employee?.name ?? '—'}
            />
            <Row
              label={t('review.labelLocation')}
              value={draft.location || '—'}
            />
            <Row
              label={t('review.labelGps')}
              value={
                draft.gps
                  ? formatGps(draft.gps.lat, draft.gps.lng)
                  : t('review.gpsNotCaptured')
              }
              mono
            />
            <Row
              label={t('review.labelSubmitted')}
              value={formatDateTime(Date.now())}
            />
            <Row
              label={t('common.photos')}
              value={t('review.photosAttached', { n: draft.photos.length })}
              last
            />
          </div>
        </div>

        {draft.photos.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: colors.goldDeep,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              {t('review.photosHeader', { n: draft.photos.length })}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}
            >
              {draft.photos.slice(0, 9).map((p, i) => (
                <PhotoTile
                  key={p.id}
                  height={88}
                  src={p.previewUrl}
                  label={`#${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {draft.description && (
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: colors.goldDeep,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              {t('review.description')}
            </div>
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: 14,
                border: `1px solid ${colors.line}`,
                fontSize: 13.5,
                lineHeight: 1.5,
                color: colors.ink,
                fontWeight: 500,
              }}
            >
              {draft.description}
            </div>
          </div>
        )}

        {draft.notes && (
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: colors.goldDeep,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              {t('review.notes')}
            </div>
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: 14,
                border: `1px solid ${colors.line}`,
                fontSize: 13.5,
                lineHeight: 1.5,
                color: colors.ink,
                fontWeight: 500,
              }}
            >
              {draft.notes}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 14,
            background: 'rgba(31,61,43,0.04)',
            border: `1px solid ${colors.line}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              flexShrink: 0,
              background: colors.gold,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckIcon color={colors.forest} size={18} />
          </div>
          <div
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 700,
              color: colors.charcoal,
              lineHeight: 1.35,
            }}
          >
            {t('review.confirmCompleted')}
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              background: 'rgba(180,90,60,0.10)',
              color: '#A04A2E',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <PrimaryButton color="gold" disabled={busy} onClick={submit}>
            {busy ? t('review.submitting') : t('review.submitFinal')}
          </PrimaryButton>
        </div>
        <div
          style={{
            textAlign: 'center',
            marginTop: 12,
            fontSize: 12,
            color: colors.muted,
            fontWeight: 500,
          }}
        >
          {t('review.lockNotice')}
        </div>
      </div>
    </PhoneFrame>
  );
}
