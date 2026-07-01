import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { CaseForm } from '../components/CaseForm';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { useSessionStore } from '../store/session';
import { createCase } from '../lib/cases';
import type { CreateCaseInput } from '../lib/cases';

export function CreateCase() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const employee = useSessionStore((s) => s.employee);

  const [saving, setSaving] = useState(false);

  async function handleCreate(input: CreateCaseInput) {
    if (!employee) return;
    setSaving(true);
    try {
      const newCase = await createCase(input, employee.id);
      if (newCase) {
        navigate(`/cases/${newCase.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar
        title={t('cases.createTitle')}
        eyebrow={t('cases.eyebrow')}
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
        <CaseForm
          submitting={saving}
          submitLabel={t(saving ? 'cases.creating' : 'cases.createCase')}
          onSubmit={handleCreate}
        />
      </div>
    </PhoneFrame>
  );
}
