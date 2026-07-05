import { useEffect, useRef, useState } from 'react';
import { HAS_SUPABASE, getSupabase } from '../lib/supabase';
import { PrimaryButton } from './Button';
import { Field } from './Field';
import { PhotoTile } from './PhotoTile';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { useSessionStore } from '../store/session';
import type { Employee } from '../lib/types';
import type { CreateCaseInput } from '../lib/cases';

export interface CaseFormProps {
  initial?: Partial<CreateCaseInput> | null;
  submitting: boolean;
  submitLabel: string;
  /** Show the optional reference-photo staging grid (create flow only). */
  withPhotos?: boolean;
  /** Accent of the submit button — CreateCase uses gold. */
  submitColor?: 'forest' | 'gold';
  /** Helper line rendered under the submit button. */
  submitHint?: string;
  onSubmit: (input: CreateCaseInput, photos: File[]) => void;
}

/** Employee role → common-namespace label key. */
const ROLE_KEY: Record<string, string> = {
  employee: 'common.roleEmployee',
  supervisor: 'common.roleSupervisor',
  admin: 'common.roleAdmin',
  super_admin: 'common.roleSuperAdmin',
};

interface StagedPhoto {
  file: File;
  url: string;
}

export function CaseForm({
  initial,
  submitting,
  submitLabel,
  withPhotos = false,
  submitColor = 'forest',
  submitHint,
  onSubmit,
}: CaseFormProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const me = useSessionStore((s) => s.employee);

  const [jobType, setJobType] = useState(initial?.jobType ?? '');
  const [clientOrSite, setClientOrSite] = useState(initial?.clientOrSite ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>(
    initial?.priority ?? 'medium',
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [dueTime, setDueTime] = useState(initial?.dueTime ?? '');
  const [estTime, setEstTime] = useState(initial?.estTime ?? '');
  const [remind, setRemind] = useState(initial?.remind ?? true);
  const [instructions, setInstructions] = useState(initial?.instructions ?? '');
  const [assignedTo, setAssignedTo] = useState<string | null>(initial?.assignedTo ?? null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // Reference photos staged locally; uploaded by the parent after create.
  const [staged, setStaged] = useState<StagedPhoto[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
      // Everyone active can take work — staff can assign cases to themselves
      // too. Field employees are listed first; super_admin stays hidden from
      // everyone except that super_admin (mirrors the Team screen rule).
      const { data } = await sb
        .from('employees')
        .select('id, name, role, active, initials, avatar_color, created_at')
        .eq('active', true)
        .order('created_at', { ascending: true });
      const ORDER: Record<string, number> = {
        employee: 0,
        supervisor: 1,
        admin: 2,
        super_admin: 3,
      };
      const list = ((data ?? []) as Employee[])
        .filter((e) => e.role !== 'super_admin' || e.id === me?.id)
        .sort((a, b) => (ORDER[a.role] ?? 9) - (ORDER[b.role] ?? 9));
      setEmployees(list);
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

  const selected = assignedTo
    ? employees.find((e) => e.id === assignedTo) ?? null
    : null;

  function handleAddPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next = Array.from(files).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setStaged((prev) => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleRemoveStaged(index: number) {
    setStaged((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const input: CreateCaseInput = {
      jobType: jobType.trim(),
      clientOrSite: clientOrSite.trim() || null,
      location: location.trim(),
      priority,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      estTime: estTime.trim() || null,
      remind,
      instructions: instructions.trim() || null,
      assignedTo: assignedTo || undefined,
    };
    onSubmit(input, staged.map((p) => p.file));
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

      <Field
        label={t('cases.instructionsLabel')}
        value={instructions}
        placeholder={t('cases.instructionsPlaceholder')}
        height={84}
        multi
        onChange={setInstructions}
      />

      {withPhotos && (
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
            {t('cases.refPhotosLabel')}{' '}
            <span style={{ color: colors.muted, fontWeight: 600 }}>
              · {t('cases.refPhotosOptional')}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {staged.map((p, i) => (
              <PhotoTile
                key={p.url}
                height={66}
                src={p.url}
                onRemove={() => handleRemoveStaged(i)}
              />
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="kt-tap"
              aria-label={t('cases.addPhoto')}
              style={{
                height: 66,
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
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                <rect
                  x="2"
                  y="6"
                  width="16"
                  height="11"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M7 6l1.2-2h3.6L13 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="11.5" r="3" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  marginTop: 3,
                  textTransform: 'uppercase',
                }}
              >
                {t('cases.photoAdd')}
              </span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleAddPhotos(e.target.files)}
          />
        </div>
      )}

      <div style={{ marginBottom: 16, position: 'relative' }}>
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
          {t('cases.assignToLabel')}
        </div>
        {selected ? (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="kt-tap"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textAlign: 'left',
              background: '#fff',
              borderRadius: 14,
              padding: '10px 12px',
              border: `1.5px solid ${colors.forest}`,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: selected.avatar_color ?? '#7FA66E',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 0.3,
                flexShrink: 0,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              {selected.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: colors.charcoal,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selected.name}
              </div>
              <div style={{ fontSize: 11.5, color: colors.muted, fontWeight: 500, marginTop: 1 }}>
                {t(ROLE_KEY[selected.role] ?? 'common.roleEmployee')}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: colors.forest,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              {t('cases.change')}
            </span>
          </button>
        ) : (
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
              color: colors.muted,
            }}
          >
            {t('cases.unassignedPool')}
          </button>
        )}

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
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {e.name}
                    {e.id === me?.id ? ` (${t('cases.you')})` : ''}
                  </span>
                  {e.role !== 'employee' && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: colors.goldDeep,
                        letterSpacing: 0.6,
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}
                    >
                      {t(ROLE_KEY[e.role] ?? 'common.roleEmployee')}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
          {t('cases.priorityLabel')}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 6,
            background: '#fff',
            padding: 5,
            borderRadius: 13,
            border: `1px solid ${colors.line}`,
          }}
        >
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
                  padding: '9px 0',
                  borderRadius: 9,
                  fontSize: 12.5,
                  fontWeight: 700,
                  border: 'none',
                  background: on ? accent : 'transparent',
                  color: on ? '#fff' : colors.muted,
                  transition: 'background 140ms, color 140ms',
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

      <Field
        label={t('cases.estTimeLabel')}
        value={estTime}
        placeholder={t('cases.estTimePlaceholder')}
        onChange={setEstTime}
      />

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

      <PrimaryButton color={submitColor} disabled={!canSubmit} onClick={handleSubmit}>
        {submitLabel}
      </PrimaryButton>
      {submitHint && (
        <div
          style={{
            textAlign: 'center',
            marginTop: 12,
            fontSize: 11.5,
            color: colors.muted,
            fontWeight: 500,
          }}
        >
          {submitHint}
        </div>
      )}
    </>
  );
}
