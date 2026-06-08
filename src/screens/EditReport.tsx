import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { Field } from '../components/Field';
import { PrimaryButton } from '../components/Button';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { HAS_SUPABASE, getSupabase } from '../lib/supabase';
import { ktStore } from '../lib/offline-store';
import { notifyNewReport } from '../lib/notifications';

/**
 * Employee edit + resubmit flow. Opens a report flagged "needs_update",
 * shows the reviewer's note, lets the employee fix the text fields and
 * resubmit (status → submitted), looping until it's approved.
 */
export function EditReport() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jobType, setJobType] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [reviewNote, setReviewNote] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        if (HAS_SUPABASE) {
          const sb = getSupabase();
          const { data } = await sb
            .from('reports')
            .select('job_type, location, description, notes, review_note')
            .eq('id', id)
            .single();
          if (data) {
            setJobType((data.job_type as string) ?? '');
            setLocation((data.location as string) ?? '');
            setDescription((data.description as string) ?? '');
            setNotes((data.notes as string) ?? '');
            setReviewNote((data.review_note as string) ?? null);
          }
        } else {
          const r = await ktStore.getReport(id);
          if (r) {
            setJobType(r.jobType);
            setLocation(r.location);
            setDescription(r.description);
            setNotes(r.notes ?? '');
            setReviewNote(r.reviewNote ?? null);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function resubmit() {
    setSaving(true);
    try {
      if (HAS_SUPABASE) {
        const sb = getSupabase();
        await sb
          .from('reports')
          .update({
            job_type: jobType,
            location,
            description,
            notes,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            review_note: null,
          })
          .eq('id', id);
      } else {
        await ktStore.updateReport(id, {
          jobType,
          location,
          description,
          notes,
          status: 'submitted',
          reviewNote: undefined,
        });
        await notifyNewReport({ id, jobType });
      }
      navigate('/my-reports');
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    jobType.trim().length > 1 &&
    location.trim().length > 1 &&
    description.trim().length > 1;

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar
        title={t('editReport.title')}
        eyebrow={t('editReport.eyebrow')}
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
        {!loading && reviewNote && (
          <div
            style={{
              background: 'rgba(180,90,60,0.10)',
              border: '1px solid rgba(180,90,60,0.25)',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: '#A04A2E',
                marginBottom: 4,
              }}
            >
              {t('editReport.changesNeeded')}
            </div>
            <div
              style={{
                fontSize: 13.5,
                color: colors.charcoal,
                lineHeight: 1.4,
              }}
            >
              {reviewNote}
            </div>
          </div>
        )}

        <Field
          label={t('newReport.jobTypeLabel')}
          value={jobType}
          placeholder={t('newReport.jobTypePlaceholder')}
          onChange={setJobType}
        />
        <Field
          label={t('newReport.locationLabel')}
          value={location}
          placeholder={t('newReport.locationPlaceholder')}
          onChange={setLocation}
        />
        <Field
          label={t('newReport.descriptionLabel')}
          value={description}
          placeholder={t('newReport.descriptionPlaceholder')}
          multi
          height={84}
          onChange={setDescription}
        />
        <Field
          label={t('newReport.notesLabel')}
          value={notes}
          placeholder={t('newReport.notesPlaceholder')}
          height={56}
          onChange={setNotes}
        />

        <div style={{ height: 8 }} />
        <PrimaryButton
          color="gold"
          disabled={!canSubmit || saving}
          onClick={resubmit}
        >
          {saving ? t('editReport.resubmitting') : t('editReport.resubmit')}
        </PrimaryButton>
      </div>
    </PhoneFrame>
  );
}
