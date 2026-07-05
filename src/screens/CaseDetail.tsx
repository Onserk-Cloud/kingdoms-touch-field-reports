import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { PrimaryButton, SecondaryButton } from '../components/Button';
import { PhotoTile } from '../components/PhotoTile';
import { Lightbox } from '../components/Lightbox';
import { Badge } from '../components/Badge';
import { Priority } from '../components/Priority';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { useSessionStore } from '../store/session';
import { HAS_SUPABASE, getSupabase } from '../lib/supabase';
import { getDemoEmployee } from '../lib/auth';
import {
  getCase,
  setCaseStatus,
  claimCase,
  caseRef,
  caseStatusBadge,
  caseStatusKey,
  dueLabel,
  listCasePhotos,
  uploadCasePhoto,
  deleteCasePhoto,
  getCasePhotoUrl,
  listCaseActivity,
  addCaseComment,
  type Case,
  type CasePhoto,
  type CaseActivity,
  type CaseActivityKind,
} from '../lib/cases';
import { formatDateTime, initialsOf, relativeDate } from '../lib/format';

const RED = '#B53D2E';

function isStaff(role?: string): boolean {
  return ['supervisor', 'admin', 'super_admin'].includes(role ?? '');
}

/** Local 'YYYY-MM-DD' (matches the date column format). */
function todayStr(): string {
  return new Date().toLocaleDateString('en-CA');
}

const ROLE_KEYS: Record<string, string> = {
  employee: 'common.roleEmployee',
  supervisor: 'common.roleSupervisor',
  admin: 'common.roleAdmin',
  super_admin: 'common.roleSuperAdmin',
};

/** Minimal assignee profile shown on the staff detail card. */
interface AssigneeProfile {
  name: string;
  initials: string;
  color: string | null;
  role: string | null;
}

/** Per-kind accent colour for the activity timeline nodes. */
function eventColor(
  kind: CaseActivityKind,
  c: { gold: string; goldDeep: string; blue: string; forest: string; danger: string },
): string {
  switch (kind) {
    case 'created':
      return c.gold;
    case 'assigned':
      return c.goldDeep;
    case 'status':
      return c.blue;
    case 'submitted':
      return c.forest;
    default:
      // reopened
      return c.danger;
  }
}

/** Per-kind white glyph for the 28px timeline nodes (16×16 viewBox). */
function eventGlyph(kind: CaseActivityKind) {
  switch (kind) {
    case 'created':
      return (
        <path d="M8 4v8M4 8h8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      );
    case 'assigned':
      return (
        <>
          <circle cx="8" cy="6" r="2.4" stroke="#fff" strokeWidth="1.5" />
          <path
            d="M4 12.5c.7-2 2.2-3 4-3s3.3 1 4 3"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      );
    case 'status':
      return <path d="M6 4.5l5 3.5-5 3.5v-7z" fill="#fff" />;
    case 'submitted':
      return (
        <path
          d="M4 8.5l2.5 2.5L12 5"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    default:
      // reopened
      return (
        <path
          d="M11.5 8A3.5 3.5 0 114.9 6.3M4.5 3.5v3h3"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
  }
}

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const employee = useSessionStore((s) => s.employee);

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const c = await getCase(id);
      setCaseData(c);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartReport() {
    if (!caseData) return;
    // Signal the case is being worked on as the employee opens the report form.
    if (caseData.status === 'assigned') {
      void setCaseStatus(caseData.id, 'in_progress');
    }
    navigate(`/new-report?case=${caseData.id}`);
  }

  async function handleClaim() {
    if (!caseData || !employee) return;
    setUpdating(true);
    try {
      const updated = await claimCase(caseData.id, employee.id);
      if (updated) setCaseData(updated);
      void loadActivity();
    } finally {
      setUpdating(false);
    }
  }

  async function handleSetStatus(status: Case['status']) {
    if (!caseData) return;
    setUpdating(true);
    try {
      const updated = await setCaseStatus(
        caseData.id,
        status,
        status === 'needs_changes' ? reviewNote : null,
      );
      if (updated) {
        setCaseData(updated);
        setReviewNote('');
      }
      void loadActivity();
    } finally {
      setUpdating(false);
    }
  }

  const [photos, setPhotos] = useState<CasePhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadPhotos() {
    if (!id) return;
    const list = await listCasePhotos(id);
    const urls: Record<string, string> = {};
    for (const p of list) {
      const u = await getCasePhotoUrl(p.storagePath);
      if (u) urls[p.id] = u;
    }
    setPhotoUrls(urls);
    setPhotos(list);
  }

  async function handleAddPhotos(files: FileList | null) {
    if (!files || !id || !employee) return;
    setUploadingPhoto(true);
    try {
      for (const f of Array.from(files)) {
        await uploadCasePhoto(id, f, employee.id);
      }
      await loadPhotos();
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleRemovePhoto(p: CasePhoto) {
    await deleteCasePhoto(p);
    await loadPhotos();
  }

  const [activity, setActivity] = useState<CaseActivity[]>([]);
  const [comment, setComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    void loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadActivity() {
    if (!id) return;
    const list = await listCaseActivity(id);
    setActivity(list);
  }

  async function handlePostComment() {
    if (!id || !employee || !comment.trim()) return;
    setPostingComment(true);
    try {
      const entry = await addCaseComment(id, employee.id, comment);
      if (entry) {
        setComment('');
        await loadActivity();
      }
    } finally {
      setPostingComment(false);
    }
  }

  function focusComposer() {
    commentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    commentRef.current?.focus();
  }

  // ─── Assignee profile (getCase doesn't join the employee row) ────────────
  const [assignee, setAssignee] = useState<AssigneeProfile | null>(null);

  useEffect(() => {
    const aid = caseData?.assignedTo;
    if (!aid) {
      setAssignee(null);
      return;
    }
    if (caseData?.assigneeName) {
      setAssignee({
        name: caseData.assigneeName,
        initials: caseData.assigneeInitials ?? initialsOf(caseData.assigneeName),
        color: caseData.assigneeColor ?? null,
        role: null,
      });
      return;
    }
    if (!HAS_SUPABASE) {
      const demo = getDemoEmployee(aid);
      setAssignee(
        demo
          ? {
              name: demo.name,
              initials: demo.initials,
              color: demo.avatar_color ?? null,
              role: demo.role,
            }
          : null,
      );
      return;
    }
    let active = true;
    void (async () => {
      try {
        const sb = getSupabase();
        const { data } = await sb
          .from('employees')
          .select('name, role, initials, avatar_color')
          .eq('id', aid)
          .single();
        if (active && data) {
          setAssignee({
            name: data.name as string,
            initials: (data.initials as string) || initialsOf(data.name as string),
            color: (data.avatar_color ?? null) as string | null,
            role: (data.role ?? null) as string | null,
          });
        }
      } catch (err) {
        console.error('[KT] load assignee failed', err);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData?.assignedTo, caseData?.assigneeName]);

  const isAssigned = caseData?.assignedTo === employee?.id;
  const isStaffMember = isStaff(employee?.role);
  const isCreator = caseData?.createdBy === employee?.id;

  if (loading) {
    return (
      <PhoneFrame bg={colors.ivory}>
        <AppBar
          title={t('cases.detailTitle')}
          onBack={() => navigate('/cases')}
        />
        <div
          style={{
            padding: 20,
            textAlign: 'center',
            color: colors.muted,
            fontSize: 13,
          }}
        >
          {t('common.loading')}
        </div>
      </PhoneFrame>
    );
  }

  if (!caseData) {
    return (
      <PhoneFrame bg={colors.ivory}>
        <AppBar
          title={t('cases.detailTitle')}
          onBack={() => navigate('/cases')}
        />
        <div
          style={{
            padding: 20,
            textAlign: 'center',
            color: colors.muted,
            fontSize: 13,
          }}
        >
          {t('cases.notFound')}
        </div>
      </PhoneFrame>
    );
  }

  const c = caseData;
  const heroView =
    isAssigned &&
    (c.status === 'assigned' ||
      c.status === 'in_progress' ||
      c.status === 'needs_changes');
  const canAct = isStaffMember && (isCreator || employee?.role === 'super_admin');
  const showReviewBar =
    canAct && (c.status === 'submitted' || c.status === 'in_review');

  const due = dueLabel(c.dueDate, c.dueTime);
  const dueUrgent =
    !!c.dueDate && (c.priority === 'urgent' || c.dueDate <= todayStr());
  const mapQuery = c.location ?? c.clientOrSite ?? '';
  const roleKey = assignee?.role ? ROLE_KEYS[assignee.role] : null;

  // Who assigned this case (hero subtitle) — read from the activity feed.
  const assignEvt =
    [...activity].reverse().find((a) => a.kind === 'assigned' && !!a.actorName) ??
    activity.find((a) => a.kind === 'created' && !!a.actorName);

  // ─── Shared cards (rendered by both the employee hero + staff layouts) ───

  const locationCard = mapQuery ? (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: 14,
        border: `1px solid ${colors.line}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: 'rgba(31,61,43,0.06)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 16.5s-5.5-4.6-5.5-9a5.5 5.5 0 1111 0c0 4.4-5.5 9-5.5 9z"
            stroke={colors.forest}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="7.5" r="2" stroke={colors.forest} strokeWidth="1.5" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: colors.charcoal,
            letterSpacing: -0.1,
          }}
        >
          {c.clientOrSite ?? c.location}
        </div>
        {c.clientOrSite && c.location && (
          <div
            style={{ fontSize: 12, color: colors.muted, marginTop: 1, fontWeight: 500 }}
          >
            {c.location}
          </div>
        )}
      </div>
      <a
        className="kt-tap"
        href={`https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`}
        target="_blank"
        rel="noreferrer"
        style={{
          padding: '8px 12px',
          borderRadius: 10,
          background: colors.forest,
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        {t('cases.mapLabel')}
      </a>
    </div>
  ) : null;

  const reviewNoteCard = c.reviewNote ? (
    <div
      style={{
        background: 'rgba(180,90,60,0.08)',
        borderRadius: 14,
        padding: 12,
        border: `1px solid rgba(180,90,60,0.20)`,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: colors.danger,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {t('cases.reviewNote')}
      </div>
      <div style={{ fontSize: 12, color: colors.danger, lineHeight: 1.4 }}>
        {c.reviewNote}
      </div>
    </div>
  ) : null;

  const instructionsCard = c.instructions ? (
    <div style={{ marginBottom: 16 }}>
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
        {t('cases.instructions')}
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
          whiteSpace: 'pre-wrap',
        }}
      >
        {c.instructions}
      </div>
    </div>
  ) : null;

  const photosCard =
    isStaffMember || isAssigned ? (
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 16,
          border: `1px solid ${colors.line}`,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: colors.goldDeep,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          {t('cases.photosTitle')}
        </div>
        {photos.length === 0 && (
          <div style={{ fontSize: 12.5, color: colors.muted, marginBottom: 10 }}>
            {t('cases.noPhotos')}
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {photos.map((p) => (
            <PhotoTile
              key={p.id}
              height={92}
              src={photoUrls[p.id]}
              onClick={() => photoUrls[p.id] && setPreview(photoUrls[p.id])}
              onRemove={
                isStaffMember || p.uploadedBy === employee?.id
                  ? () => void handleRemovePhoto(p)
                  : undefined
              }
            />
          ))}
          <Lightbox src={preview} onClose={() => setPreview(null)} />
          <div
            onClick={() => fileRef.current?.click()}
            className="kt-tap"
            style={{
              height: 92,
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
            <span style={{ fontSize: 22, lineHeight: 1 }}>＋</span>
            <span style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>
              {uploadingPhoto ? t('common.loading') : t('cases.addPhoto')}
            </span>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => void handleAddPhotos(e.target.files)}
        />
      </div>
    ) : null;

  // ─── Activity timeline (28px colored nodes + 2px connector) + composer ───

  const activityCard = (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: 16,
        border: `1px solid ${colors.line}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: colors.goldDeep,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        {t('cases.activityTitle')}
      </div>

      {activity.length === 0 ? (
        <div style={{ fontSize: 12.5, color: colors.muted, marginBottom: 4 }}>
          {t('cases.activityEmpty')}
        </div>
      ) : (
        <div style={{ paddingLeft: 2 }}>
          {activity.map((a, i) => {
            const last = i === activity.length - 1;
            const isComment = a.kind === 'comment';
            const nodeColor = isComment ? colors.forest : eventColor(a.kind, colors);
            return (
              <div key={a.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                {/* connector line */}
                {!last && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 13,
                      top: 28,
                      bottom: -6,
                      width: 2,
                      background: colors.ivoryDeep,
                    }}
                  />
                )}
                {/* node */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: nodeColor,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 1,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                  }}
                >
                  {isComment ? (
                    initialsOf(a.actorName ?? t('cases.system'))
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      {eventGlyph(a.kind)}
                    </svg>
                  )}
                </div>
                {/* body */}
                <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 2 : 18 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: colors.charcoal,
                        letterSpacing: -0.1,
                        minWidth: 0,
                      }}
                    >
                      {isComment
                        ? (a.actorName ?? t('cases.system'))
                        : a.kind === 'status'
                          ? t('cases.evtStatus', {
                              status: t(
                                caseStatusKey(String(a.meta?.to) as Case['status']),
                              ),
                            })
                          : a.kind === 'created'
                            ? t('cases.evtCreated')
                            : a.kind === 'assigned'
                              ? t('cases.evtAssigned')
                              : a.kind === 'submitted'
                                ? t('cases.evtSubmitted')
                                : t('cases.evtReopened')}
                    </span>
                    <span
                      style={{ fontSize: 10.5, color: colors.muted, flexShrink: 0 }}
                    >
                      {formatDateTime(a.createdAt)}
                    </span>
                  </div>
                  {isComment ? (
                    <div
                      style={{
                        fontSize: 13,
                        color: colors.charcoal,
                        lineHeight: 1.4,
                        marginTop: 2,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {a.body}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: colors.muted,
                        marginTop: 2,
                        fontWeight: 500,
                      }}
                    >
                      {a.actorName ?? t('cases.system')}
                      {a.body ? ` — ${a.body}` : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(isStaffMember || isAssigned) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <textarea
            ref={commentRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('cases.commentPlaceholder')}
            className="kt-input"
            rows={1}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 12,
              border: `1px solid ${colors.line}`,
              fontSize: 13,
              fontFamily: 'Manrope',
              minHeight: 42,
              resize: 'none',
            }}
          />
          <button
            onClick={() => void handlePostComment()}
            disabled={postingComment || !comment.trim()}
            className="kt-tap"
            style={{
              alignSelf: 'stretch',
              padding: '0 16px',
              borderRadius: 12,
              border: 'none',
              background:
                postingComment || !comment.trim() ? colors.line : colors.forest,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
              cursor: comment.trim() ? 'pointer' : 'default',
            }}
          >
            {postingComment ? t('cases.commentPosting') : t('cases.commentPost')}
          </button>
        </div>
      )}
    </div>
  );

  // ─── EMPLOYEE ASSIGNED VIEW — forest hero + pinned START JOB bar ──────────

  if (heroView) {
    return (
      <PhoneFrame bg={colors.ivory}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Forest hero header */}
          <div
            className="kt-safe-top"
            style={{
              background: colors.forest,
              color: '#fff',
              padding: '58px 20px 26px',
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* radial gold glow */}
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
                position: 'relative',
              }}
            >
              <button
                onClick={() => navigate('/cases')}
                className="kt-tap"
                aria-label={t('common.back')}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="9" height="16" viewBox="0 0 9 16" fill="none">
                  <path
                    d="M8 1L1 8L8 15"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {c.status === 'assigned' ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '5px 12px',
                    borderRadius: 999,
                    background: 'rgba(196,152,76,0.20)',
                    border: `1px solid ${colors.gold}`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: colors.gold,
                      boxShadow: `0 0 6px ${colors.gold}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                      color: colors.goldSoft,
                    }}
                  >
                    {t('cases.newAssignment')}
                  </span>
                </div>
              ) : (
                <Badge
                  kind={caseStatusBadge(c.status)}
                  label={t(caseStatusKey(c.status))}
                />
              )}
            </div>

            <div
              style={{
                marginTop: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                position: 'relative',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.goldSoft,
                  letterSpacing: 1.2,
                }}
              >
                #{caseRef(c)}
              </span>
              <Priority level={c.priority} size="sm" />
            </div>
            <div
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 27,
                fontWeight: 500,
                letterSpacing: -0.5,
                lineHeight: 1.1,
                marginTop: 8,
                position: 'relative',
              }}
            >
              {c.jobType}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.7)',
                marginTop: 8,
                fontWeight: 500,
                position: 'relative',
              }}
            >
              {t('cases.assignedBy')}{' '}
              <b style={{ color: '#fff' }}>
                {assignEvt?.actorName ?? t('cases.system')}
              </b>
              {' · '}
              {relativeDate(assignEvt?.createdAt ?? c.createdAt)}
            </div>
          </div>

          {/* Scrollable body */}
          <div
            className="kt-scroll"
            style={{ flex: 1, overflow: 'auto', padding: '18px 20px 24px' }}
          >
            {/* Key facts: Due / Est. time */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  flex: 1,
                  background: '#fff',
                  borderRadius: 14,
                  padding: 14,
                  border: `1px solid ${colors.line}`,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: colors.muted,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('cases.dueDateShort')}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: dueUrgent ? RED : colors.charcoal,
                    marginTop: 4,
                    letterSpacing: -0.2,
                  }}
                >
                  {due || '—'}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  background: '#fff',
                  borderRadius: 14,
                  padding: 14,
                  border: `1px solid ${colors.line}`,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: colors.muted,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('cases.estTimeLabel')}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: colors.charcoal,
                    marginTop: 4,
                    letterSpacing: -0.2,
                  }}
                >
                  {c.estTime ?? '—'}
                </div>
              </div>
            </div>

            {locationCard}
            {reviewNoteCard}
            {instructionsCard}
            {photosCard}
            {activityCard}
          </div>

          {/* Pinned footer: message + START JOB */}
          <div
            style={{
              flexShrink: 0,
              background: '#fff',
              borderTop: `1px solid ${colors.line}`,
              padding: '12px 16px 30px',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <button
              onClick={focusComposer}
              className="kt-tap"
              aria-label={t('cases.message')}
              style={{
                width: 52,
                height: 54,
                borderRadius: 14,
                border: `1px solid ${colors.line}`,
                background: '#fff',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3 5a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2H8l-4 3v-3H5a2 2 0 01-2-2V5z"
                  stroke={colors.forest}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <PrimaryButton
              color="gold"
              onClick={handleStartReport}
              style={{
                flex: 1,
                height: 54,
                fontSize: 15,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              {t('cases.startJob')}
            </PrimaryButton>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // ─── STAFF / SUPERVISOR (and default) VIEW ────────────────────────────────

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar
        title={`#${caseRef(c)}`}
        eyebrow={c.jobType}
        onBack={() => navigate('/cases')}
        trailing={
          isStaffMember ? (
            <button
              onClick={() => navigate(`/cases/${id}/edit`)}
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
              {t('cases.edit')}
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
          // Reserve clearance for the pinned review bar.
          padding: showReviewBar ? '16px 20px 130px' : '16px 20px 40px',
        }}
      >
        {/* Status + priority + due strip */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 14,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Badge
            kind={caseStatusBadge(c.status)}
            label={t(caseStatusKey(c.status))}
          />
          <Priority level={c.priority} size="sm" />
          {due && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 11,
                fontWeight: 700,
                color: dueUrgent ? RED : colors.forestSoft,
              }}
            >
              {due}
            </span>
          )}
        </div>

        {/* Assignee card */}
        {isStaffMember && c.assignedTo && assignee && (
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 13,
              border: `1px solid ${colors.line}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: assignee.color ?? colors.forestSoft,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              {assignee.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{ fontSize: 14.5, fontWeight: 700, color: colors.charcoal }}
              >
                {assignee.name}
              </div>
              {roleKey && (
                <div
                  style={{
                    fontSize: 12,
                    color: colors.muted,
                    fontWeight: 500,
                    marginTop: 1,
                  }}
                >
                  {t(roleKey)}
                </div>
              )}
            </div>
            <button
              onClick={() => navigate(`/cases/${id}/edit`)}
              className="kt-tap"
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: `1px solid ${colors.line}`,
                background: '#fff',
                fontSize: 11,
                fontWeight: 700,
                color: colors.forest,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              {t('cases.reassign')}
            </button>
          </div>
        )}

        {locationCard}
        {reviewNoteCard}
        {instructionsCard}
        {photosCard}

        {!isStaffMember && c.status === 'available' && (
          <>
            <PrimaryButton color="gold" disabled={updating} onClick={handleClaim}>
              {t('cases.claim')}
            </PrimaryButton>
            <div style={{ height: 10 }} />
          </>
        )}

        {canAct && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {(c.status === 'assigned' ||
              c.status === 'in_progress' ||
              c.status === 'submitted' ||
              c.status === 'in_review') && (
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={t('cases.reviewNotePlaceholder')}
                className="kt-input"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: `1px solid ${colors.line}`,
                  fontSize: 13,
                  fontFamily: 'Manrope',
                  minHeight: 64,
                }}
              />
            )}
            {(c.status === 'assigned' || c.status === 'in_progress') && (
              <SecondaryButton
                onClick={() => handleSetStatus('needs_changes')}
                disabled={updating}
              >
                {t('cases.requestChanges')}
              </SecondaryButton>
            )}
            {c.status !== 'closed' && (
              <SecondaryButton
                onClick={() => handleSetStatus('closed')}
                disabled={updating}
              >
                {t('cases.close')}
              </SecondaryButton>
            )}
          </div>
        )}

        {activityCard}
      </div>

      {/* Pinned review actions: Request changes + Start review / Approve */}
      {showReviewBar && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 5,
            background: '#fff',
            borderTop: `1px solid ${colors.line}`,
            padding: '12px 16px 30px',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => handleSetStatus('needs_changes')}
            disabled={updating}
            className="kt-tap"
            style={{
              flex: 1,
              height: 50,
              borderRadius: 13,
              background: '#fff',
              border: `1.5px solid ${colors.danger}`,
              color: colors.danger,
              fontFamily: 'Manrope',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.2,
              opacity: updating ? 0.55 : 1,
            }}
          >
            {t('cases.requestChanges')}
          </button>
          {c.status === 'submitted' ? (
            <button
              onClick={() => handleSetStatus('in_review')}
              disabled={updating}
              className="kt-tap"
              style={{
                flex: 1.2,
                height: 50,
                borderRadius: 13,
                border: 'none',
                background: colors.forest,
                color: '#fff',
                fontFamily: 'Manrope',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 6px 14px rgba(31,61,43,0.22)',
                opacity: updating ? 0.55 : 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4" stroke={colors.gold} strokeWidth="1.8" />
                <path
                  d="M9 9l3 3"
                  stroke={colors.gold}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              {t('cases.startReview')}
            </button>
          ) : (
            <button
              onClick={() => handleSetStatus('approved')}
              disabled={updating}
              className="kt-tap"
              style={{
                flex: 1.2,
                height: 50,
                borderRadius: 13,
                border: 'none',
                background: colors.forest,
                color: '#fff',
                fontFamily: 'Manrope',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 6px 14px rgba(31,61,43,0.22)',
                opacity: updating ? 0.55 : 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 7l3 3 5-6"
                  stroke={colors.gold}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('cases.approve')}
            </button>
          )}
        </div>
      )}
    </PhoneFrame>
  );
}
