import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { Field } from '../components/Field';
import { PrimaryButton } from '../components/Button';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { useSessionStore } from '../store/session';
import { HAS_SUPABASE, getSupabase } from '../lib/supabase';
import { createCase } from '../lib/cases';
import type { Employee } from '../lib/types';

export function CreateCase() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const employee = useSessionStore((s) => s.employee);

  const [jobType, setJobType] = useState('');
  const [clientOrSite, setClientOrSite] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Load active employees on mount
  useEffect(() => {
    void loadEmployees();
  }, []);

  async function loadEmployees() {
    if (!HAS_SUPABASE) {
      setLoadingEmployees(false);
      return;
    }
    try {
      const sb = getSupabase();
      const { data } = await sb
        .from('employees')
        .select('id, name, role, active, initials, avatar_color, created_at')
        .eq('active', true)
        .eq('role', 'employee')
        .order('created_at', { ascending: true });
      setEmployees((data ?? []) as Employee[]);
    } catch (err) {
      console.error('[KT] loadEmployees failed', err);
    } finally {
      setLoadingEmployees(false);
    }
  }

  const canSubmit =
    jobType.trim().length > 1 &&
    location.trim().length > 1 &&
    !saving;

  async function handleSubmit() {
    if (!employee || !canSubmit) return;
    setSaving(true);
    try {
      const newCase = await createCase(
        {
          jobType: jobType.trim(),
          clientOrSite: clientOrSite.trim() || null,
          location: location.trim(),
          priority,
          dueDate: dueDate || null,
          instructions: instructions.trim() || null,
          assignedTo: assignedTo || undefined,
        },
        employee.id,
      );
      if (newCase) {
        navigate('/cases');
      }
    } finally {
      setSaving(false);
    }
  }

  const assignedName = assignedTo
    ? employees.find((e) => e.id === assignedTo)?.name
    : null;

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
        <Field
          label={t('cases.jobTypeLabel')}
          value={jobType}
          placeholder={t('cases.jobTypePlaceholder')}
          onChange={setJobType}
        />

        <Field
          label={t('cases.clientOrSiteLabel')}
          value={clientOrSite}
          placeholder={t('cases.clientOrSitePlaceholder')}
          onChange={setClientOrSite}
        />

        <Field
          label={t('cases.locationLabel')}
          value={location}
          placeholder={t('cases.locationPlaceholder')}
          onChange={setLocation}
        />

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.goldDeep,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {t('cases.priorityLabel')}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['low', 'medium', 'high'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className="kt-tap"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  border: `1.5px solid ${priority === p ? colors.gold : colors.line}`,
                  background: '#fff',
                  color: priority === p ? colors.forest : colors.muted,
                }}
              >
                {t(`cases.priority${p[0].toUpperCase()}${p.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        <Field
          label={t('cases.dueDateLabel')}
          type="date"
          value={dueDate}
          onChange={setDueDate}
        />

        <Field
          label={t('cases.instructionsLabel')}
          value={instructions}
          placeholder={t('cases.instructionsPlaceholder')}
          height={84}
          multi
          onChange={setInstructions}
        />

        <div style={{ marginBottom: 16, position: 'relative' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.goldDeep,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {t('cases.assignToLabel')}
          </div>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="kt-tap"
            style={{
              width: '100%',
              textAlign: 'left',
              background: '#fff',
              borderRadius: 14,
              padding: '12px 14px',
              border: `1px solid ${colors.line}`,
              fontSize: 15,
              fontWeight: 600,
              color: assignedTo ? colors.charcoal : colors.muted,
            }}
          >
            {assignedName || t('cases.unassignedPool')}
          </button>

          {showPicker && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 10,
                marginTop: 4,
                background: '#fff',
                borderRadius: 14,
                border: `1px solid ${colors.line}`,
                maxHeight: 240,
                overflow: 'auto',
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setAssignedTo(null);
                  setShowPicker(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setAssignedTo(null);
                    setShowPicker(false);
                  }
                }}
                className="kt-tap"
                style={{
                  padding: '12px 14px',
                  borderBottom: `1px solid ${colors.line}`,
                  cursor: 'pointer',
                  color: !assignedTo ? colors.gold : colors.muted,
                  fontWeight: !assignedTo ? 700 : 600,
                }}
              >
                {t('cases.unassignedPool')}
              </div>
              {loadingEmployees ? (
                <div style={{ padding: 12, textAlign: 'center', color: colors.muted }}>
                  {t('common.loading')}
                </div>
              ) : employees.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center', color: colors.muted }}>
                  {t('cases.noEmployees')}
                </div>
              ) : (
                employees.map((e) => (
                  <div
                    key={e.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setAssignedTo(e.id);
                      setShowPicker(false);
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        setAssignedTo(e.id);
                        setShowPicker(false);
                      }
                    }}
                    className="kt-tap"
                    style={{
                      padding: '12px 14px',
                      borderBottom: `1px solid ${colors.line}`,
                      cursor: 'pointer',
                      color: assignedTo === e.id ? colors.gold : colors.charcoal,
                      fontWeight: assignedTo === e.id ? 700 : 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: e.avatar_color ?? '#7FA66E',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 12,
                        flexShrink: 0,
                      }}
                    >
                      {e.initials}
                    </div>
                    <span>{e.name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <PrimaryButton disabled={!canSubmit} onClick={handleSubmit}>
          {saving ? t('cases.creating') : t('cases.createCase')}
        </PrimaryButton>
      </div>
    </PhoneFrame>
  );
}
