import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { CaseForm } from '../components/CaseForm';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { getCase, updateCase } from '../lib/cases';
import type { Case, CreateCaseInput } from '../lib/cases';

export function EditCase() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  async function handleSave(input: CreateCaseInput) {
    if (!id) return;
    setSaving(true);
    try {
      await updateCase(id, input);
      navigate(`/cases/${id}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PhoneFrame bg={colors.ivory}>
        <AppBar
          title={t('cases.editTitle')}
          onBack={() => (id ? navigate(`/cases/${id}`) : navigate('/cases'))}
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
          title={t('cases.editTitle')}
          onBack={() => (id ? navigate(`/cases/${id}`) : navigate('/cases'))}
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
        title={t('cases.editTitle')}
        onBack={() => navigate(`/cases/${id}`)}
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
        <CaseForm
          initial={{
            jobType: caseData.jobType,
            clientOrSite: caseData.clientOrSite,
            location: caseData.location,
            priority: caseData.priority,
            dueDate: caseData.dueDate,
            instructions: caseData.instructions,
            assignedTo: caseData.assignedTo,
          }}
          submitting={saving}
          submitLabel={t(saving ? 'cases.saving' : 'cases.saveChanges')}
          onSubmit={handleSave}
        />
      </div>
    </PhoneFrame>
  );
}
