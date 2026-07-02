import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { Badge } from '../components/Badge';
import { PhotoTile } from '../components/PhotoTile';
import { CheckIcon } from '../components/Icons';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { HAS_SUPABASE, getSupabase } from '../lib/supabase';
import { getPhotoUrl } from '../lib/uploader';
import { exportReportPdf } from '../lib/pdf';
import { formatDateTime, formatGps, initialsOf } from '../lib/format';
import { useSessionStore } from '../store/session';
import { ktStore } from '../lib/offline-store';
import { notifyReview } from '../lib/notifications';
import { reverseGeocode, mapsUrl } from '../lib/geocode';
import { getDemoEmployee } from '../lib/auth';
import type { OfflinePhoto, OfflineReport } from '../lib/types';

interface DetailRow {
  id: string;
  job_type: string;
  location: string;
  description: string;
  notes: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  completion_confirmed: boolean;
  created_at: string;
  employee: {
    id: string;
    name: string;
    initials: string;
    avatar_color: string;
  };
  photos: { id: string; storage_path: string; caption: string | null }[];
}

export function SupervisorDetail() {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();
  const me = useSessionStore((s) => s.employee);
  const [row, setRow] = useState<DetailRow | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState<'approve' | 'request' | 'pdf' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Resolve a human-readable address from the captured GPS point.
  useEffect(() => {
    setAddress(null);
    if (row?.gps_lat == null || row?.gps_lng == null) return;
    let alive = true;
    void reverseGeocode(row.gps_lat, row.gps_lng, locale).then((a) => {
      if (alive) setAddress(a);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.gps_lat, row?.gps_lng, locale]);

  async function load() {
    setLoading(true);
    setError(false);
    if (!HAS_SUPABASE) {
      // Demo mode: build the detail view from the IndexedDB-seeded report.
      try {
        const r = await ktStore.getReport(id);
        // Defense-in-depth: an employee may only view their own report.
        // (Supabase mode is already enforced by RLS.)
        if (!r || (me?.role === 'employee' && r.employeeId !== me.id)) {
          setRow(null);
          return;
        }
        const photos = await ktStore.listPhotos(id);
        const emp = getDemoEmployee(r.employeeId);
        setPhotoUrls(photos.map((p) => URL.createObjectURL(p.blob)));
        setRow({
          id: r.id,
          job_type: r.jobType,
          location: r.location,
          description: r.description,
          notes: r.notes ?? null,
          gps_lat: r.gps?.lat ?? null,
          gps_lng: r.gps?.lng ?? null,
          gps_accuracy: r.gps?.accuracy ?? null,
          status:
            r.status === 'error'
              ? 'needs_update'
              : r.status === 'draft'
                ? 'pending'
                : r.status,
          submitted_at:
            r.status === 'draft' ? null : new Date(r.createdAt).toISOString(),
          reviewed_at: null,
          review_note: r.reviewNote ?? null,
          completion_confirmed: r.completionConfirmed,
          created_at: new Date(r.createdAt).toISOString(),
          employee: {
            id: r.employeeId,
            name: emp?.name ?? 'Field Technician',
            initials: emp?.initials ?? initialsOf(emp?.name ?? 'Field Tech'),
            avatar_color: emp?.avatar_color ?? '#7FA66E',
          },
          photos: photos.map((p) => ({
            id: p.id,
            storage_path: '',
            caption: p.caption ?? null,
          })),
        });
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('reports')
        .select(
          'id, job_type, location, description, notes, gps_lat, gps_lng, gps_accuracy, status, submitted_at, reviewed_at, review_note, completion_confirmed, created_at, employee:employees!employee_id(id, name, initials, avatar_color), photos:report_photos(id, storage_path, caption)',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // 0 rows = not found / not visible to this account (RLS), not a
        // network error. Show the clean "not found" state, not the retry card.
        setRow(null);
        return;
      }
      setRow(data as unknown as DetailRow);
      if (data?.photos) {
        const urls = await Promise.all(
          data.photos.map((p: any) => getPhotoUrl(p.storage_path)),
        );
        setPhotoUrls(urls.filter(Boolean) as string[]);
      }
    } catch (err) {
      console.error('[KT] detail load failed', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function approve() {
    if (!row) return;
    setBusy('approve');
    try {
      if (HAS_SUPABASE && me) {
        const sb = getSupabase();
        await sb
          .from('reports')
          .update({
            status: 'reviewed',
            reviewed_at: new Date().toISOString(),
            reviewed_by: me.id,
          })
          .eq('id', row.id);
      } else {
        // Demo mode: persist the reviewed status so the employee sees it too.
        await ktStore.setStatus(row.id, 'reviewed');
        await notifyReview(
          { id: row.id, employeeId: row.employee.id, jobType: row.job_type },
          'reviewed',
        );
      }
      navigate('/supervisor');
    } finally {
      setBusy(null);
    }
  }

  async function doRequestUpdate(note: string) {
    if (!row) return;
    setReasonOpen(false);
    setBusy('request');
    try {
      if (HAS_SUPABASE && me) {
        const sb = getSupabase();
        await sb
          .from('reports')
          .update({
            status: 'needs_update',
            reviewed_at: new Date().toISOString(),
            reviewed_by: me.id,
            review_note: note || null,
          })
          .eq('id', row.id);
      } else {
        // Demo mode: persist needs_update + the note so the employee sees it.
        await ktStore.updateReport(row.id, {
          status: 'needs_update',
          reviewNote: note || undefined,
        });
        await notifyReview(
          { id: row.id, employeeId: row.employee.id, jobType: row.job_type },
          'needs_update',
          note,
        );
      }
      navigate('/supervisor');
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    if (!row) return;
    setBusy('pdf');
    try {
      // Build a synthetic OfflineReport from the remote row + fetched blobs.
      const blobs: OfflinePhoto[] = [];
      for (let i = 0; i < row.photos.length; i++) {
        const p = row.photos[i];
        const url = photoUrls[i];
        if (!url) continue;
        const res = await fetch(url);
        const blob = await res.blob();
        blobs.push({
          id: p.id,
          reportId: row.id,
          blob,
          caption: p.caption ?? undefined,
          createdAt: Date.now(),
        });
      }
      const synthReport: OfflineReport = {
        id: row.id,
        employeeId: row.employee.id,
        jobType: row.job_type,
        location: row.location,
        gps: row.gps_lat
          ? {
              lat: row.gps_lat,
              lng: row.gps_lng ?? 0,
              accuracy: row.gps_accuracy ?? 0,
            }
          : null,
        description: row.description,
        notes: row.notes ?? '',
        completionConfirmed: row.completion_confirmed,
        createdAt: new Date(row.submitted_at ?? row.created_at).getTime(),
        status: 'submitted',
        remoteId: row.id,
      };
      await exportReportPdf(synthReport, blobs, {
        locale,
        employeeName: row.employee.name,
        approverName: me?.name,
        address,
        approvedAt: row.reviewed_at
          ? new Date(row.reviewed_at).getTime()
          : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <PhoneFrame bg={colors.ivory}>
        <AppBar title={t('common.loading')} />
      </PhoneFrame>
    );
  }

  if (error) {
    return (
      <PhoneFrame bg={colors.ivory}>
        <AppBar title={t('supervisorDetail.notFoundTitle')} />
        <div
          style={{
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              background: colors.dangerSoft,
              border: `1px solid ${colors.dangerLine}`,
              borderRadius: 14,
              padding: '14px 16px',
              color: colors.charcoal,
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {t('common.loadError')}
          </div>
          <button
            onClick={() => void load()}
            className="kt-tap"
            style={{
              height: 48,
              borderRadius: 12,
              background: colors.forest,
              color: '#fff',
              fontFamily: 'Manrope',
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 0.3,
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      </PhoneFrame>
    );
  }

  if (!row) {
    return (
      <PhoneFrame bg={colors.ivory}>
        <AppBar title={t('supervisorDetail.notFoundTitle')} />
        <div
          style={{
            padding: '24px 20px',
            color: colors.muted,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {t('supervisorDetail.notFoundBody')}
        </div>
      </PhoneFrame>
    );
  }

  const Row = ({
    label,
    value,
    mono,
  }: {
    label: string;
    value: string;
    mono?: boolean;
  }) => (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: colors.muted,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
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

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar
        title={t('supervisorDetail.reportTitle', {
          id: row.id.slice(-4).toUpperCase(),
        })}
        eyebrow={
          row.submitted_at
            ? t('supervisorDetail.submittedEyebrow', {
                date: formatDateTime(row.submitted_at),
              })
            : t('supervisorDetail.notSubmittedEyebrow')
        }
        trailing={
          <button
            onClick={exportPdf}
            disabled={busy !== null}
            aria-label={t('supervisorDetail.exportPdf')}
            className="kt-tap"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: colors.ivory,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="2" r="1.3" fill={colors.charcoal} />
              <circle cx="7" cy="7" r="1.3" fill={colors.charcoal} />
              <circle cx="7" cy="12" r="1.3" fill={colors.charcoal} />
            </svg>
          </button>
        }
      />

      <div
        className="kt-scroll"
        style={{
          position: 'absolute',
          top: 110,
          bottom: 90,
          left: 0,
          right: 0,
          overflow: 'auto',
          padding: '16px 20px 30px',
        }}
      >
        {row.status === 'needs_update' && row.review_note && (
          <div
            style={{
              background: colors.dangerSoft,
              border: `1px solid ${colors.dangerLine}`,
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: colors.danger,
                marginBottom: 4,
              }}
            >
              {t('supervisorDetail.changesRequested')}
            </div>
            <div
              style={{
                fontSize: 13.5,
                color: colors.charcoal,
                lineHeight: 1.4,
              }}
            >
              {row.review_note}
            </div>
            {me?.role === 'employee' && (
              <button
                onClick={() => navigate(`/report/${row.id}/edit`)}
                className="kt-tap"
                style={{
                  marginTop: 10,
                  width: '100%',
                  height: 44,
                  borderRadius: 11,
                  background: colors.forest,
                  color: '#fff',
                  fontFamily: 'Manrope',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {t('supervisorDetail.editResubmit')}
              </button>
            )}
          </div>
        )}
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            padding: 14,
            border: `1px solid ${colors.line}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: row.employee.avatar_color ?? '#7FA66E',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 0.3,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30)',
            }}
          >
            {row.employee.initials || initialsOf(row.employee.name)}
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
              {row.employee.name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: colors.muted,
                marginTop: 2,
                fontWeight: 500,
              }}
            >
              {t('supervisorDetail.crewSubtitle')}
            </div>
          </div>
          <Badge
            kind={
              row.status === 'reviewed'
                ? 'reviewed'
                : row.status === 'needs_update'
                  ? 'flagged'
                  : 'submitted'
            }
          />
        </div>

        <div
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 22,
            fontWeight: 500,
            color: colors.charcoal,
            letterSpacing: -0.4,
            lineHeight: 1.2,
          }}
        >
          {row.job_type}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: colors.muted,
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {row.location}
        </div>

        {row.gps_lat != null && row.gps_lng != null && (
          <div
            style={{
              marginTop: 14,
              background: colors.forest,
              color: '#fff',
              borderRadius: 18,
              height: 150,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.18,
                backgroundImage: `
                  linear-gradient(${colors.goldSoft} 0.6px, transparent 0.6px),
                  linear-gradient(90deg, ${colors.goldSoft} 0.6px, transparent 0.6px)
                `,
                backgroundSize: '28px 28px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -90%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: colors.gold,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow:
                    '0 6px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
                  border: '2px solid #fff',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1.5C5 1.5 3 3 3 5.5 3 8 7 12 7 12s4-4 4-6.5C11 3 9 1.5 7 1.5z"
                    fill={colors.forest}
                  />
                  <circle cx="7" cy="5.5" r="1.5" fill={colors.gold} />
                </svg>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 12,
                right: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: colors.goldSoft,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('supervisorDetail.gpsVerified')}
                </div>
                <div
                  style={{
                    fontFamily: 'ui-monospace, Menlo, monospace',
                    fontSize: 11,
                    marginTop: 2,
                    color: '#fff',
                    opacity: 0.85,
                  }}
                >
                  {formatGps(row.gps_lat, row.gps_lng)}
                </div>
              </div>
              {row.gps_accuracy != null && (
                <div
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.20)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                  }}
                >
                  ±{Math.round(row.gps_accuracy)}m
                </div>
              )}
            </div>
          </div>
        )}

        {row.gps_lat != null && row.gps_lng != null && (
          <div
            style={{
              marginTop: 10,
              background: '#fff',
              border: `1px solid ${colors.line}`,
              borderRadius: 14,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: colors.goldDeep,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  marginBottom: 3,
                }}
              >
                {t('supervisorDetail.addressEyebrow')}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.charcoal,
                  lineHeight: 1.35,
                }}
              >
                {address ?? formatGps(row.gps_lat, row.gps_lng)}
              </div>
            </div>
            <a
              href={mapsUrl(row.gps_lat, row.gps_lng)}
              target="_blank"
              rel="noreferrer"
              className="kt-tap"
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 44,
                padding: '0 14px',
                borderRadius: 12,
                background: colors.forest,
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.2,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1.5C5 1.5 3 3 3 5.5 3 8 7 12.5 7 12.5s4-4.5 4-7C11 3 9 1.5 7 1.5z"
                  stroke="#fff"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <circle cx="7" cy="5.5" r="1.4" fill="#fff" />
              </svg>
              {t('supervisorDetail.openMap')}
            </a>
          </div>
        )}

        {row.photos.length > 0 && (
          <div style={{ marginTop: 18 }}>
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
                {t('supervisorDetail.photosCount', { n: row.photos.length })}
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}
            >
              {row.photos.map((p, i) => (
                <PhotoTile
                  key={p.id}
                  height={92}
                  src={photoUrls[i]}
                  label={`#${i + 1}`}
                  onClick={() => photoUrls[i] && setLightbox(photoUrls[i])}
                />
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 18,
            padding: 16,
            background: '#fff',
            borderRadius: 18,
            border: `1px solid ${colors.line}`,
          }}
        >
          <Row
            label={t('supervisorDetail.jobTypeLabel')}
            value={row.job_type}
          />
          <Row
            label={t('supervisorDetail.submittedLabel')}
            value={row.submitted_at ? formatDateTime(row.submitted_at) : '—'}
          />
          <div
            style={{ height: 1, background: colors.line, margin: '6px 0 14px' }}
          />
          <Row
            label={t('supervisorDetail.descriptionLabel')}
            value={row.description || '—'}
          />
          {row.notes && (
            <Row label={t('supervisorDetail.notesLabel')} value={row.notes} />
          )}
          {row.completion_confirmed && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 4,
                padding: '10px 12px',
                borderRadius: 11,
                background: 'rgba(143,165,139,0.16)',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  background: colors.forest,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckIcon color="#fff" size={14} />
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: colors.forest,
                  letterSpacing: -0.1,
                }}
              >
                {t('supervisorDetail.completionConfirmed')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer action bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: `1px solid ${colors.line}`,
          padding: '12px 16px 30px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
        className="kt-safe-bottom"
      >
        <button
          onClick={exportPdf}
          disabled={busy !== null}
          aria-label={t('supervisorDetail.exportPdf')}
          className="kt-tap"
          style={{
            width: 46,
            height: 50,
            borderRadius: 13,
            border: `1px solid ${colors.line}`,
            background: '#fff',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M4 3h7l3 3v9H4V3z"
              stroke={colors.forest}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M11 3v3h3"
              stroke={colors.forest}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M9 8v6m0 0l-2-2m2 2l2-2"
              stroke={colors.forest}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {me && me.role !== 'employee' && (
          <>
            <button
              onClick={() => {
                setReasonText('');
                setReasonOpen(true);
              }}
              disabled={busy !== null}
              className="kt-tap"
              style={{
                flex: 1,
                height: 50,
                borderRadius: 13,
                background: '#fff',
                border: `1.5px solid ${colors.forest}`,
                color: colors.forest,
                fontFamily: 'Manrope',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              {busy === 'request' ? '…' : t('supervisorDetail.requestUpdate')}
            </button>
            <button
              onClick={approve}
              disabled={busy !== null}
              className="kt-tap"
              style={{
                flex: 1.2,
                height: 50,
                borderRadius: 13,
                background: colors.forest,
                color: '#fff',
                fontFamily: 'Manrope',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 0.3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 6px 14px rgba(31,61,43,0.22)',
              }}
            >
              {busy === 'approve' ? (
                '…'
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 7l3 3 5-6"
                      stroke={colors.gold}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t('supervisorDetail.approve')}
                </>
              )}
            </button>
          </>
        )}
      </div>
      {reasonOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 60,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            className="kt-safe-bottom"
            style={{
              background: '#fff',
              width: '100%',
              borderRadius: '20px 20px 0 0',
              padding: '20px 18px 30px',
            }}
          >
            <div
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 18,
                color: colors.charcoal,
                marginBottom: 10,
              }}
            >
              {t('supervisorDetail.reasonTitle')}
            </div>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder={t('supervisorDetail.reasonPlaceholder')}
              className="kt-input"
              style={{
                minHeight: 90,
                width: '100%',
                background: colors.ivory,
                borderRadius: 12,
                padding: 12,
                border: `1px solid ${colors.line}`,
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setReasonOpen(false)}
                className="kt-tap"
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  border: `1.5px solid ${colors.line}`,
                  color: colors.muted,
                  fontFamily: 'Manrope',
                  fontWeight: 700,
                }}
              >
                {t('supervisorDetail.cancel')}
              </button>
              <button
                onClick={() => doRequestUpdate(reasonText)}
                disabled={busy !== null}
                className="kt-tap"
                style={{
                  flex: 1.4,
                  height: 48,
                  borderRadius: 12,
                  background: colors.danger,
                  color: '#fff',
                  fontFamily: 'Manrope',
                  fontWeight: 800,
                }}
              >
                {busy === 'request' ? '…' : t('supervisorDetail.sendChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <img
            src={lightbox}
            alt=""
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: 8,
            }}
          />
          <button
            onClick={() => setLightbox(null)}
            aria-label={t('common.close')}
            className="kt-tap"
            style={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top) + 16px)',
              right: 16,
              width: 40,
              height: 40,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </PhoneFrame>
  );
}
