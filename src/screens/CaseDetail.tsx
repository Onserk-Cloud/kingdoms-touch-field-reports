import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { PrimaryButton, SecondaryButton } from '../components/Button';
import { Badge } from '../components/Badge';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { useSessionStore } from '../store/session';
import { getCase, setCaseStatus, claimCase } from '../lib/cases';
import { formatDate } from '../lib/format';
import type { Case } from '../lib/cases';
import type { BadgeKind } from '../components/Badge';

function caseStatusToBadge(status: Case['status']): BadgeKind {
  switch (status) {
    case 'available':
      return 'draft';
    case 'assigned':
    case 'in_progress':
      return 'pending';
    case 'submitted':
      return 'submitted';
    case 'needs_changes':
      return 'flagged';
    case 'closed':
      return 'reviewed';
    default:
      return 'draft';
  }
}

function isStaff(role?: string): boolean {
  return ['supervisor', 'admin', 'super_admin'].includes(role ?? '');
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
    } finally {
      setUpdating(false);
    }
  }

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

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar
        title={caseData.jobType}
        onBack={() => navigate('/cases')}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted }}>
              {t('cases.status')}
            </div>
            <Badge kind={caseStatusToBadge(caseData.status)} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: colors.goldDeep,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {t('cases.priority')}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color:
                    caseData.priority === 'high'
                      ? '#A04A2E'
                      : caseData.priority === 'low'
                        ? colors.muted
                        : colors.gold,
                  textTransform: 'uppercase',
                }}
              >
                {caseData.priority}
              </div>
            </div>

            {caseData.dueDate && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: colors.goldDeep,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  {t('cases.dueDate')}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: colors.charcoal,
                  }}
                >
                  {formatDate(new Date(caseData.dueDate).getTime())}
                </div>
              </div>
            )}
          </div>

          {caseData.location && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: colors.goldDeep,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {t('cases.location')}
              </div>
              <div style={{ fontSize: 13, color: colors.charcoal }}>
                {caseData.location}
              </div>
            </div>
          )}

          {caseData.clientOrSite && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: colors.goldDeep,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {t('cases.clientOrSite')}
              </div>
              <div style={{ fontSize: 13, color: colors.charcoal }}>
                {caseData.clientOrSite}
              </div>
            </div>
          )}

          {caseData.instructions && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: colors.goldDeep,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {t('cases.instructions')}
              </div>
              <div style={{ fontSize: 13, color: colors.charcoal, lineHeight: 1.4 }}>
                {caseData.instructions}
              </div>
            </div>
          )}
        </div>

        {caseData.reviewNote && (
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
                color: '#A04A2E',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {t('cases.reviewNote')}
            </div>
            <div style={{ fontSize: 12, color: '#A04A2E', lineHeight: 1.4 }}>
              {caseData.reviewNote}
            </div>
          </div>
        )}

        {!isStaffMember && caseData.status === 'available' && (
          <>
            <PrimaryButton color="gold" disabled={updating} onClick={handleClaim}>
              {t('cases.claim')}
            </PrimaryButton>
            <div style={{ height: 10 }} />
          </>
        )}

        {isAssigned &&
          (caseData.status === 'assigned' ||
            caseData.status === 'in_progress' ||
            caseData.status === 'needs_changes') && (
            <>
              <PrimaryButton color="gold" onClick={handleStartReport}>
                {t('cases.startReport')}
              </PrimaryButton>
              <div style={{ height: 10 }} />
            </>
          )}

        {isStaffMember && (isCreator || employee?.role === 'super_admin') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {caseData.status !== 'closed' && (
              <>
                {caseData.status === 'submitted' && (
                  <>
                    <SecondaryButton
                      onClick={() => handleSetStatus('in_progress')}
                      disabled={updating}
                    >
                      {t('cases.markInProgress')}
                    </SecondaryButton>
                    <PrimaryButton
                      disabled={updating}
                      onClick={() => handleSetStatus('closed')}
                    >
                      {t('cases.close')}
                    </PrimaryButton>
                  </>
                )}
                {(caseData.status === 'assigned' || caseData.status === 'in_progress') && (
                  <>
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
                        marginBottom: 8,
                        fontFamily: 'Manrope',
                        minHeight: 64,
                      }}
                    />
                    <SecondaryButton
                      onClick={() => handleSetStatus('needs_changes')}
                      disabled={updating}
                    >
                      {t('cases.requestChanges')}
                    </SecondaryButton>
                  </>
                )}
              </>
            )}
            {caseData.status !== 'closed' && (
              <SecondaryButton
                onClick={() => handleSetStatus('closed')}
                disabled={updating}
              >
                {t('cases.close')}
              </SecondaryButton>
            )}
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
