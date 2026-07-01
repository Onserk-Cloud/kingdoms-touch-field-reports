import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { Badge, type BadgeKind } from '../components/Badge';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { useSessionStore } from '../store/session';
import { HAS_SUPABASE, getSupabase } from '../lib/supabase';
import type { Role } from '../lib/types';
import type { KtColors } from '../theme';

interface Member {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  initials: string;
  avatar_color: string | null;
}

function roleLabel(r: Role, t: (k: string) => string): string {
  return t(
    r === 'super_admin'
      ? 'common.roleSuperAdmin'
      : r === 'admin'
        ? 'common.roleAdmin'
        : r === 'supervisor'
          ? 'common.roleSupervisor'
          : 'common.roleEmployee',
  );
}

const labelStyle = (colors: KtColors) => ({
  fontSize: 10.5,
  fontWeight: 700 as const,
  color: colors.goldDeep,
  letterSpacing: 1,
  textTransform: 'uppercase' as const,
  marginBottom: 4,
});

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  colors: KtColors;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={labelStyle(colors)}>{label}</div>
      <div
        style={{
          background: colors.ivory,
          borderRadius: 10,
          border: `1px solid ${colors.line}`,
          padding: '10px 12px',
        }}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          autoCapitalize={type === 'email' ? 'none' : undefined}
          autoCorrect={type === 'email' ? 'off' : undefined}
          className="kt-input"
        />
      </div>
    </div>
  );
}

function Seg({
  label,
  value,
  options,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
  colors: KtColors;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={labelStyle(colors)}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map(([val, lab]) => {
          const on = value === val;
          return (
            <button
              key={val}
              onClick={() => onChange(val)}
              className="kt-tap"
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                border: `1.5px solid ${on ? colors.gold : colors.line}`,
                background: '#fff',
                color: on ? colors.forest : colors.muted,
              }}
            >
              {lab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ManageTeam() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const me = useSessionStore((s) => s.employee);

  const [list, setList] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [access, setAccess] = useState<'pin' | 'email'>('pin');
  const [role, setRole] = useState<Role>('employee');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Reset-access modal state.
  const [resetFor, setResetFor] = useState<Member | null>(null);
  const [resetMethod, setResetMethod] = useState<'pin' | 'password'>('pin');
  const [resetPin, setResetPin] = useState('');
  const [resetPwd, setResetPwd] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const assignableRoles: Role[] =
    me?.role === 'super_admin'
      ? ['employee', 'supervisor', 'admin', 'super_admin']
      : ['employee', 'supervisor'];

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    if (!HAS_SUPABASE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sb = getSupabase();
      const { data } = await sb
        .from('employees')
        .select('id, name, role, active, initials, avatar_color')
        .order('created_at', { ascending: true });
      const rows = (data ?? []) as Member[];
      // Only a super admin can see other super admins — to everyone else
      // (admins included) that role stays invisible in the roster.
      setList(
        me?.role === 'super_admin'
          ? rows
          : rows.filter((m) => m.role !== 'super_admin'),
      );
    } finally {
      setLoading(false);
    }
  }

  async function createMember() {
    setBusy(true);
    setMsg(null);
    try {
      const sb = getSupabase();
      const fullName = `${firstName} ${lastName}`.trim();
      const body: Record<string, unknown> = {
        name: fullName,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
        access,
      };
      if (access === 'pin') body.pin = pin;
      else {
        body.email = email.trim();
        body.password = password;
      }
      const { error } = await sb.functions.invoke('admin-users', { body });
      if (error) throw error;
      setMsg(t('manage.createdOk'));
      setFirstName('');
      setLastName('');
      setPin('');
      setEmail('');
      setPassword('');
      await load();
    } catch {
      setMsg(t('manage.saveError'));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(m: Member) {
    if (!HAS_SUPABASE) return;
    const sb = getSupabase();
    await sb.from('employees').update({ active: !m.active }).eq('id', m.id);
    await load();
  }

  async function doUnlock(m: Member) {
    if (!HAS_SUPABASE) return;
    setMsg(null);
    try {
      const sb = getSupabase();
      const { error } = await sb.functions.invoke('admin-users', {
        body: { action: 'unlock', employeeId: m.id },
      });
      if (error) throw error;
      setMsg(t('manage.unlockedOk', { name: m.name }));
    } catch {
      setMsg(t('manage.saveError'));
    }
  }

  function openReset(m: Member) {
    setResetFor(m);
    setResetMethod(m.role === 'employee' ? 'pin' : 'password');
    setResetPin('');
    setResetPwd('');
    setResetMsg(null);
  }

  async function doReset() {
    if (!resetFor) return;
    setResetBusy(true);
    setResetMsg(null);
    try {
      const sb = getSupabase();
      const body =
        resetMethod === 'pin'
          ? { action: 'reset_pin', employeeId: resetFor.id, pin: resetPin }
          : {
              action: 'reset_password',
              employeeId: resetFor.id,
              password: resetPwd,
            };
      const { error } = await sb.functions.invoke('admin-users', { body });
      if (error) throw error;
      setResetMsg(t('manage.resetOk'));
      setResetPin('');
      setResetPwd('');
      setTimeout(() => setResetFor(null), 900);
    } catch {
      setResetMsg(t('manage.saveError'));
    } finally {
      setResetBusy(false);
    }
  }

  const canReset =
    resetMethod === 'pin' ? /^\d{4}$/.test(resetPin) : resetPwd.length >= 6;

  const badgeForRole = (r: Role): BadgeKind =>
    r === 'employee'
      ? 'submitted'
      : r === 'supervisor'
        ? 'pending'
        : 'reviewed';

  const canSubmit =
    firstName.trim().length > 1 &&
    (access === 'pin'
      ? /^\d{4}$/.test(pin)
      : email.includes('@') && password.length >= 6);

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar
        title={t('manage.title')}
        eyebrow={t('manage.eyebrow')}
        onBack={() => navigate('/supervisor')}
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
        {!HAS_SUPABASE ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: colors.muted,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {t('manage.demoNotice')}
          </div>
        ) : (
          <>
            <div
              style={{
                background: '#fff',
                border: `1px solid ${colors.line}`,
                borderRadius: 18,
                padding: 16,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontFamily: 'Cinzel, Georgia, serif',
                  fontSize: 16,
                  color: colors.charcoal,
                  marginBottom: 12,
                }}
              >
                {t('manage.addMember')}
              </div>
              <LabeledInput
                label={t('login.firstName')}
                value={firstName}
                onChange={setFirstName}
                colors={colors}
              />
              <LabeledInput
                label={t('login.lastName')}
                value={lastName}
                onChange={setLastName}
                colors={colors}
              />
              <Seg
                label={t('manage.accessType')}
                value={access}
                onChange={(v) => setAccess(v as 'pin' | 'email')}
                options={[
                  ['pin', t('manage.pinAccess')],
                  ['email', t('manage.emailAccess')],
                ]}
                colors={colors}
              />
              <Seg
                label={t('manage.role')}
                value={role}
                onChange={(v) => setRole(v as Role)}
                options={assignableRoles.map((r) => [r, roleLabel(r, t)])}
                colors={colors}
              />
              {access === 'pin' ? (
                <LabeledInput
                  label={t('manage.pin')}
                  value={pin}
                  onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
                  colors={colors}
                />
              ) : (
                <>
                  <LabeledInput
                    label={t('manage.email')}
                    value={email}
                    onChange={setEmail}
                    type="email"
                    colors={colors}
                  />
                  <LabeledInput
                    label={t('manage.password')}
                    value={password}
                    onChange={setPassword}
                    type="password"
                    colors={colors}
                  />
                </>
              )}
              {msg && (
                <div
                  style={{
                    fontSize: 12,
                    color: colors.muted,
                    margin: '8px 0',
                    fontWeight: 600,
                  }}
                >
                  {msg}
                </div>
              )}
              <button
                onClick={createMember}
                disabled={busy || !canSubmit}
                className="kt-tap"
                style={{
                  marginTop: 8,
                  width: '100%',
                  height: 50,
                  borderRadius: 13,
                  background: colors.forest,
                  color: '#fff',
                  fontFamily: 'Manrope',
                  fontSize: 14,
                  fontWeight: 800,
                  opacity: busy || !canSubmit ? 0.5 : 1,
                }}
              >
                {busy ? t('manage.creating') : t('manage.create')}
              </button>
            </div>

            {loading && (
              <div
                style={{
                  textAlign: 'center',
                  color: colors.muted,
                  padding: 20,
                }}
              >
                {t('common.loading')}
              </div>
            )}
            {!loading && list.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  color: colors.muted,
                  padding: 20,
                  fontSize: 13,
                }}
              >
                {t('manage.empty')}
              </div>
            )}
            {list.map((m) => (
              <div
                key={m.id}
                style={{
                  background: '#fff',
                  border: `1px solid ${colors.line}`,
                  borderRadius: 14,
                  padding: '12px 14px',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: m.avatar_color ?? '#7FA66E',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    opacity: m.active ? 1 : 0.4,
                    flexShrink: 0,
                  }}
                >
                  {m.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: colors.charcoal,
                      fontSize: 14,
                    }}
                  >
                    {m.name}
                    {me?.id === m.id ? ` · ${t('manage.you')}` : ''}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Badge
                      kind={badgeForRole(m.role)}
                      label={roleLabel(m.role, t)}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={() => openReset(m)}
                    className="kt-tap"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: colors.forest,
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: `1px solid ${colors.line}`,
                    }}
                  >
                    {t('manage.reset')}
                  </button>
                  <button
                    onClick={() => doUnlock(m)}
                    className="kt-tap"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: colors.goldDeep,
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: `1px solid ${colors.line}`,
                    }}
                  >
                    {t('manage.unlock')}
                  </button>
                  {me?.id !== m.id && (
                    <button
                      onClick={() => toggleActive(m)}
                      className="kt-tap"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: m.active ? '#A04A2E' : colors.forest,
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: `1px solid ${colors.line}`,
                      }}
                    >
                      {m.active ? t('manage.deactivate') : t('manage.activate')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      {resetFor && (
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
                fontFamily: 'Cinzel, Georgia, serif',
                fontSize: 18,
                color: colors.charcoal,
                marginBottom: 12,
              }}
            >
              {t('manage.resetTitle', { name: resetFor.name })}
            </div>
            <Seg
              label={t('manage.accessType')}
              value={resetMethod}
              onChange={(v) => setResetMethod(v as 'pin' | 'password')}
              options={[
                ['pin', t('manage.methodPin')],
                ['password', t('manage.methodPassword')],
              ]}
              colors={colors}
            />
            {resetMethod === 'pin' ? (
              <LabeledInput
                label={t('manage.newPin')}
                value={resetPin}
                onChange={(v) => setResetPin(v.replace(/\D/g, '').slice(0, 4))}
                colors={colors}
              />
            ) : (
              <LabeledInput
                label={t('manage.newPassword')}
                value={resetPwd}
                onChange={setResetPwd}
                type="password"
                colors={colors}
              />
            )}
            {resetMsg && (
              <div
                style={{
                  fontSize: 12,
                  color: colors.muted,
                  margin: '6px 0',
                  fontWeight: 600,
                }}
              >
                {resetMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={() => setResetFor(null)}
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
                {t('manage.cancel')}
              </button>
              <button
                onClick={doReset}
                disabled={resetBusy || !canReset}
                className="kt-tap"
                style={{
                  flex: 1.4,
                  height: 48,
                  borderRadius: 12,
                  background: colors.forest,
                  color: '#fff',
                  fontFamily: 'Manrope',
                  fontWeight: 800,
                  opacity: resetBusy || !canReset ? 0.5 : 1,
                }}
              >
                {resetBusy ? t('manage.creating') : t('manage.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
