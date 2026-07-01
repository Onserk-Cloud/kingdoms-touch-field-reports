import { useEffect, useState } from 'react';
import { HAS_SUPABASE, getSupabase } from '../lib/supabase';
import { PrimaryButton } from './Button';
import { Field } from './Field';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import type { Employee } from '../lib/types';
import type { CreateCaseInput } from '../lib/cases';

export interface CaseFormProps {
  initial?: Partial<CreateCaseInput> | null;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (input: CreateCaseInput) => void;
}

export function CaseForm({ initial, submitting, submitLabel, onSubmit }: CaseFormProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const [jobType, setJobType] = useState(initial?.jobType ?? '');
  const [clientOrSite, setClientOrSite] = useState(initial?.clientOrSite ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>(
    initial?.priority ?? 'medium',
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [dueTime, setDueTime] = useState(initial?.dueTime ?? '');
  const [remind, setRemind] = useState(initial?.remind ?? true);
  const [instructions, setInstructions] = useState(initial?.instructions ?? '');
  const [assignedTo, setAssignedTo] = useState<string | null>(initial?.assignedTo ?? null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

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
    !submitting;

  const assignedName = assignedTo
    ? employees.find((e) => e.id === assignedTo)?.name
    : null;

  function handleSubmit() {
    if (!canSubmit) return;
    const input: CreateCaseInput = {
      jobType: jobType.trim(),
      clientOrSite: clientOrSite.trim() || null,
      location: location.trim(),
      priority,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      remind,
      instructions: instructions.trim() || null,
      assignedTo: assignedTo || undefined,
    };
    onSubmit(input);
  }

  return (
    <>
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
          {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
            const on = priority === p;
            const accent = p === 'urgent' ? '#B53D2E' : colors.forest;
            return (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className="kt-tap"
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  border: `1.5px solid ${on ? accent : colors.line}`,
                  background: on ? accent : '#fff',
                  color: on ? '#fff' : colors.muted,
                }}
              >
                {t(`cases.priority${p[0].toUpperCase()}${p.slice(1)}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field
            label={t('cases.dueDateLabel')}
            type="date"
            value={dueDate}
            onChange={setDueDate}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Field
            label={t('cases.dueTimeLabel')}
            type="time"
            value={dueTime}
            onChange={setDueTime}
          />
        </div>
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#fff',
          borderRadius: 14,
          padding: 14,
          border: `1px solid ${colors.line}`,
          marginBottom: 16,
          cursor: 'pointer',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.charcoal }}>
            {t('cases.reminderLabel')}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: colors.muted,
              marginTop: 1,
              fontWeight: 500,
            }}
          >
            {t('cases.reminderSub')}
          </div>
        </div>
        <input
          type="checkbox"
          checked={remind}
          onChange={(e) => setRemind(e.target.checked)}
          style={{ display: 'none' }}
        />
        <div
          style={{
            width: 46,
            height: 27,
            borderRadius: 999,
            background: remind ? colors.forest : colors.line,
            position: 'relative',
            flexShrink: 0,
            transition: 'background 140ms',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 3,
              [remind ? 'right' : 'left']: 3,
              width: 21,
              height: 21,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            }}
          />
        </div>
      </label>

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
        {submitLabel}
      </PrimaryButton>
    </>
  );
}
