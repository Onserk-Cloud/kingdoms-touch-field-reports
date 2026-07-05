import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { Field } from '../components/Field';
import { PrimaryButton, SecondaryButton } from '../components/Button';
import { PhotoTile } from '../components/PhotoTile';
import { Lightbox } from '../components/Lightbox';
import { CameraIcon, CheckIcon, PinIcon } from '../components/Icons';
import { useTheme } from '../theme-context';
import { useDraftStore } from '../store/draft';
import { useSessionStore } from '../store/session';
import { useGeolocation } from '../lib/geo';
import { compressPhoto } from '../lib/compress';
import { ktStore } from '../lib/offline-store';
import { formatGps } from '../lib/format';
import { caseRef, getCase } from '../lib/cases';
import { useI18n } from '../lib/i18n';

export function NewReport() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const draft = useDraftStore();
  const setDraft = useDraftStore((s) => s.set);
  const employee = useSessionStore((s) => s.employee);
  const { state: gps, capture } = useGeolocation(true);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('case');
  const [caseInfo, setCaseInfo] = useState<{ ref: string; job: string } | null>(
    null,
  );

  // Arrived from an assigned case → prefill job type + location (only when the
  // draft fields are still empty, so we never clobber in-progress edits).
  useEffect(() => {
    if (!caseId) return;
    let active = true;
    void (async () => {
      const c = await getCase(caseId);
      if (!active || !c) return;
      setCaseInfo({ ref: caseRef(c), job: c.jobType });
      setDraft({
        jobType: draft.jobType || c.jobType,
        location: draft.location || c.location || '',
      });
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Sync GPS into the draft store when ready. Depend on the STABLE setter
  // (not the whole store object) — depending on `draft` here re-fires the
  // effect on every store update and causes an infinite render loop.
  useEffect(() => {
    if (gps.phase === 'ready') {
      setDraft({ gps: gps.fix });
    }
  }, [gps, setDraft]);

  // Persist the in-progress report as a draft in IndexedDB (works in demo
  // mode — no Supabase needed) and return Home.
  async function handleSaveOffline() {
    if (!employee) {
      navigate('/home');
      return;
    }
    setSaving(true);
    try {
      const id = await ktStore.saveDraft({
        employeeId: employee.id,
        jobType: draft.jobType,
        location: draft.location,
        description: draft.description,
        notes: draft.notes,
        gps: draft.gps,
        completionConfirmed: draft.completionConfirmed,
      });
      for (const p of draft.photos) {
        await ktStore.addPhoto(id, p.blob);
      }
      draft.reset();
      navigate('/home');
    } finally {
      setSaving(false);
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const compressed = await compressPhoto(f);
      draft.addPhoto(compressed);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const canContinue =
    draft.jobType.trim().length > 1 &&
    draft.location.trim().length > 1 &&
    draft.description.trim().length > 1 &&
    draft.completionConfirmed &&
    draft.photos.length >= 2;

  // What still blocks the submit — shown under the disabled button so the
  // user never has to guess.
  const missing = [
    draft.jobType.trim().length > 1 ? null : t('newReport.missJobType'),
    draft.location.trim().length > 1 ? null : t('newReport.missLocation'),
    draft.description.trim().length > 1 ? null : t('newReport.missDescription'),
    draft.photos.length >= 2
      ? null
      : t('newReport.missPhotos', { n: 2 - draft.photos.length }),
    draft.completionConfirmed ? null : t('newReport.missConfirm'),
  ].filter(Boolean) as string[];

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar
        title={caseInfo ? t('newReport.completeTicket') : t('newReport.title')}
        eyebrow={
          caseInfo
            ? `#${caseInfo.ref} · ${caseInfo.job}`
            : t('newReport.eyebrow')
        }
        onBack={() => navigate('/home')}
        trailing={
          <button
            onClick={handleSaveOffline}
            disabled={saving}
            className="kt-tap"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: colors.forest,
              padding: '8px 12px',
              borderRadius: 10,
              background: colors.ivory,
            }}
          >
            {saving ? t('newReport.saving') : t('newReport.saveDraft')}
          </button>
        }
      />

      <div
        style={{
          padding: '14px 20px 0',
          display: 'flex',
          gap: 6,
          background: colors.ivory,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: colors.forest,
          }}
        />
        <div
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: colors.gold,
          }}
        />
        <div
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: colors.line,
          }}
        />
      </div>

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
          background: colors.ivory,
        }}
      >
        {caseInfo && (
          <div
            style={{
              background: 'rgba(196,152,76,0.12)',
              border: `1px solid rgba(196,152,76,0.35)`,
              borderRadius: 14,
              padding: '10px 12px',
              marginBottom: 14,
              fontSize: 12.5,
              fontWeight: 600,
              color: colors.goldDeep,
            }}
          >
            {t('cases.workingOnCase', { job: caseInfo.job })}
          </div>
        )}

        {/* GPS card */}
        <GpsCard
          state={gps}
          address={draft.location.trim() || undefined}
          onRetry={capture}
        />

        <Field
          label={t('newReport.jobTypeLabel')}
          value={draft.jobType}
          placeholder={t('newReport.jobTypePlaceholder')}
          onChange={(v) => draft.set({ jobType: v })}
        />
        <Field
          label={t('newReport.locationLabel')}
          value={draft.location}
          placeholder={t('newReport.locationPlaceholder')}
          onChange={(v) => draft.set({ location: v })}
        />
        <Field
          label={t('newReport.descriptionLabel')}
          value={draft.description}
          placeholder={t('newReport.descriptionPlaceholder')}
          multi
          height={84}
          onChange={(v) => draft.set({ description: v })}
        />
        <Field
          label={t('newReport.notesLabel')}
          value={draft.notes}
          placeholder={t('newReport.notesPlaceholder')}
          height={56}
          onChange={(v) => draft.set({ notes: v })}
        />

        {/* Photos */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: colors.goldDeep,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              {t('newReport.photosHeader')}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: colors.muted,
              }}
            >
              {t('newReport.photosCount', { n: draft.photos.length })}
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
            }}
          >
            {draft.photos.map((p, i) => (
              <PhotoTile
                key={p.id}
                height={68}
                src={p.previewUrl}
                label={String(i + 1).padStart(2, '0')}
                onClick={() => p.previewUrl && setPreview(p.previewUrl)}
                onRemove={() => draft.removePhoto(p.id)}
              />
            ))}
            <Lightbox src={preview} onClose={() => setPreview(null)} />
            <div
              onClick={() => navigate('/camera')}
              className="kt-tap"
              style={{
                height: 68,
                borderRadius: 14,
                border: `1.5px dashed ${colors.forest}`,
                background: 'rgba(31,61,43,0.04)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.forest,
                cursor: 'pointer',
              }}
            >
              <CameraIcon color={colors.forest} size={18} />
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  marginTop: 3,
                }}
              >
                {t('newReport.addPhoto')}
              </div>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Completion confirm */}
        <label
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '14px 14px',
            border: `1px solid ${colors.line}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: draft.completionConfirmed ? colors.forest : '#fff',
              border: draft.completionConfirmed
                ? 'none'
                : `1.5px solid ${colors.lineStrong}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 140ms ease',
            }}
          >
            {draft.completionConfirmed && <CheckIcon color="#fff" size={16} />}
          </div>
          <input
            type="checkbox"
            checked={draft.completionConfirmed}
            onChange={(e) =>
              draft.set({ completionConfirmed: e.target.checked })
            }
            style={{ display: 'none' }}
          />
          <div
            style={{
              flex: 1,
              fontSize: 13.5,
              fontWeight: 600,
              color: colors.charcoal,
              lineHeight: 1.35,
            }}
          >
            {t('newReport.completionConfirm')}
          </div>
        </label>

        <PrimaryButton
          color="gold"
          disabled={!canContinue}
          onClick={() => navigate('/review')}
        >
          {t('newReport.reviewSubmit')}
        </PrimaryButton>
        {!canContinue && missing.length > 0 && (
          <div
            style={{
              fontSize: 12,
              color: colors.muted,
              marginTop: 8,
              textAlign: 'center',
              fontWeight: 600,
              lineHeight: 1.45,
            }}
          >
            {t('newReport.missingLabel')} {missing.join(' · ')}
          </div>
        )}
        <div style={{ height: 10 }} />
        <SecondaryButton onClick={handleSaveOffline}>
          {saving ? t('newReport.saving') : t('newReport.saveOffline')}
        </SecondaryButton>
      </div>
    </PhoneFrame>
  );
}

function GpsCard({
  state,
  address,
  onRetry,
}: {
  state: ReturnType<typeof useGeolocation>['state'];
  /** Human-readable job address (falls back to the draft's location field). */
  address?: string;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();

  const status = (() => {
    switch (state.phase) {
      case 'capturing':
        return {
          title: t('newReport.gpsCapturingTitle'),
          sub: t('newReport.gpsCapturingSub'),
        };
      case 'ready':
        return {
          title: t('newReport.gpsReadyTitle'),
          sub: `${formatGps(state.fix.lat, state.fix.lng)} · ±${Math.round(state.fix.accuracy)}m`,
        };
      case 'denied':
        return {
          title: t('newReport.gpsDeniedTitle'),
          sub: t('newReport.gpsDeniedSub'),
        };
      case 'error':
        return { title: t('newReport.gpsErrorTitle'), sub: state.message };
      default:
        return {
          title: t('newReport.gpsIdleTitle'),
          sub: t('newReport.gpsIdleSub'),
        };
    }
  })();

  const ok = state.phase === 'ready';

  return (
    <div
      style={{
        background: colors.forest,
        color: '#fff',
        borderRadius: 18,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 18,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.15,
          backgroundImage: `
            linear-gradient(${colors.goldSoft} 0.5px, transparent 0.5px),
            linear-gradient(90deg, ${colors.goldSoft} 0.5px, transparent 0.5px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'rgba(196,152,76,0.20)',
          border: `1px solid ${colors.gold}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <PinIcon color={colors.gold} size={18} />
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.4,
            color: colors.goldSoft,
            textTransform: 'uppercase',
          }}
        >
          {status.title}
        </div>
        {address && (
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              marginTop: 3,
              letterSpacing: -0.1,
              lineHeight: 1.3,
            }}
          >
            {address}
          </div>
        )}
        <div
          style={{
            fontSize: address ? 11.5 : 13,
            color: address ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.85)',
            marginTop: address ? 2 : 4,
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          {status.sub}
        </div>
      </div>
      {ok ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          style={{ position: 'relative', flexShrink: 0 }}
        >
          <circle cx="9" cy="9" r="8" fill={colors.gold} />
          <path
            d="M5 9l3 3 5-6"
            stroke={colors.forest}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <button
          onClick={onRetry}
          className="kt-tap"
          style={{
            position: 'relative',
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.10)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.8,
            color: '#fff',
            textTransform: 'uppercase',
          }}
        >
          {state.phase === 'capturing' ? '…' : t('common.retry')}
        </button>
      )}
    </div>
  );
}
