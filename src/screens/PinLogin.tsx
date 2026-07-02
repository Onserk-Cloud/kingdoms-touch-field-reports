import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { FullLogo } from '../components/LogoMark';
import { useTheme } from '../theme-context';
import {
  getRemember,
  setRemember as setRememberPref,
  signInWithPin,
  signInWithEmail,
  getDeviceEmployee,
  forgetDeviceEmployee,
  type DeviceEmployee,
} from '../lib/auth';
import { useSessionStore } from '../store/session';
import { useInstall } from '../lib/pwa-install';
import { HAS_SUPABASE } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

const PIN_LENGTH = 4;

export function PinLogin() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const setEmployee = useSessionStore((s) => s.setEmployee);
  const employee = useSessionStore((s) => s.employee);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [remember, setRemember] = useState(() => getRemember());
  const [mode, setMode] = useState<'pin' | 'email'>('pin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // PWA install affordance (also lives in Profile; here so first-time users
  // can install before logging in).
  const { installed, ios, promptInstall } = useInstall();
  const [showInstallHint, setShowInstallHint] = useState(false);
  const handleInstall = async () => {
    // Always try the native prompt; if it can't open (unsupported browser,
    // or Chrome hasn't armed it yet — in which case it auto-opens when ready),
    // fall back to the how-to instructions.
    const ok = await promptInstall();
    if (!ok) setShowInstallHint(true);
  };

  // Identity flow: a returning device remembers who you are, so you only
  // type a PIN. First time, you identify yourself with name + last name.
  const [deviceEmp, setDeviceEmp] = useState<DeviceEmployee | null>(() =>
    getDeviceEmployee(),
  );
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pinStep, setPinStep] = useState<'identify' | 'enter'>('identify');

  const identified = !!deviceEmp || pinStep === 'enter';
  const fullName = deviceEmp
    ? deviceEmp.name
    : `${firstName} ${lastName}`.trim();
  const displayFirst = (deviceEmp?.name ?? firstName).trim().split(' ')[0];

  async function handleEmailLogin() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const s = await signInWithEmail(email.trim(), password);
      setEmployee(s.employee);
      navigate(s.employee.role === 'employee' ? '/home' : '/supervisor', {
        replace: true,
      });
    } catch (err) {
      setError(loginErrMsg(err));
      setShake(true);
      setTimeout(() => setShake(false), 420);
    } finally {
      setBusy(false);
    }
  }

  // If already signed in, jump straight to the right home.
  useEffect(() => {
    if (employee) {
      navigate(employee.role === 'employee' ? '/home' : '/supervisor', {
        replace: true,
      });
    }
  }, [employee, navigate]);

  const press = useCallback(
    (d: string) => {
      if (busy) return;
      setError(null);
      setPin((p) => (p.length < PIN_LENGTH ? p + d : p));
    },
    [busy],
  );

  const clear = useCallback(() => {
    if (busy) return;
    setError(null);
    setPin('');
  }, [busy]);

  const back = useCallback(() => {
    if (busy) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  }, [busy]);

  // Auto-submit once 4 digits are entered (only when we know who's logging in).
  useEffect(() => {
    if (mode !== 'pin' || !identified) return;
    if (pin.length !== PIN_LENGTH) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const ident = deviceEmp
          ? { employeeId: deviceEmp.id }
          : { name: fullName };
        const s = await signInWithPin(pin, ident);
        if (cancelled) return;
        setDeviceEmp(getDeviceEmployee());
        setEmployee(s.employee);
        navigate(s.employee.role === 'employee' ? '/home' : '/supervisor', {
          replace: true,
        });
      } catch (err) {
        if (cancelled) return;
        setError(loginErrMsg(err));
        setShake(true);
        setTimeout(() => setShake(false), 420);
        setTimeout(() => setPin(''), 200);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, identified, deviceEmp, fullName, mode]);

  const handleRemember = (v: boolean) => {
    setRemember(v);
    setRememberPref(v);
    // Opting out must also drop any identity already saved on this device.
    if (!v) forgetDeviceEmployee();
  };

  function loginErrMsg(err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === 'locked') return t('login.errLocked');
    if (code === 'invalid') return t('login.errInvalid');
    if (code === 'duplicate') return t('login.errDuplicate');
    if (code === 'signin_failed' || code === 'server')
      return t('login.errServer');
    return err instanceof Error ? err.message : t('login.loginFailed');
  }

  const editName = () => {
    // Back to the name step WITHOUT wiping what was typed (fix a typo).
    setPinStep('identify');
    setPin('');
    setError(null);
  };

  const changeUser = () => {
    forgetDeviceEmployee();
    setDeviceEmp(null);
    setPinStep('identify');
    setPin('');
    setFirstName('');
    setLastName('');
    setError(null);
  };

  const goToPin = () => {
    // Last name is optional (mononyms / multi-part names are common).
    if (!firstName.trim()) return;
    setError(null);
    setPin('');
    setPinStep('enter');
  };

  const Dot = ({ i }: { i: number }) => (
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: i < pin.length ? colors.forest : 'transparent',
        border: i < pin.length ? 'none' : `1.5px solid ${colors.lineStrong}`,
        transition: 'all 0.2s',
      }}
    />
  );

  const title =
    mode === 'email'
      ? t('login.staffTitle')
      : identified && displayFirst
        ? t('login.greetingName', { name: displayFirst })
        : t('login.identifyTitle');
  const subtitle =
    mode === 'email'
      ? t('login.staffSubtitle')
      : identified
        ? t('login.enterPinSubtitle')
        : t('login.identifySubtitle');

  return (
    <PhoneFrame>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '52px 28px 30px',
          display: 'flex',
          flexDirection: 'column',
        }}
        className="kt-safe-top"
      >
        {/* Centered brand hero */}
        <div style={{ textAlign: 'center' }}>
          <FullLogo variant="color" width={208} />
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: colors.goldDeep,
              letterSpacing: 2.6,
              textTransform: 'uppercase',
              marginTop: 14,
            }}
          >
            {t('login.eyebrow')}
          </div>
        </div>

        <div style={{ marginTop: 'auto', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'Fraunces, Georgia, serif',
              fontSize: 28,
              fontWeight: 500,
              color: colors.charcoal,
              letterSpacing: -0.4,
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 14,
              color: colors.muted,
              marginTop: 8,
              fontWeight: 500,
            }}
          >
            {subtitle}
          </div>
        </div>

        {mode === 'pin' ? (
          identified ? (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: 18,
                  justifyContent: 'center',
                  margin: '34px 0 12px',
                  animation: shake ? 'kt-shake 0.4s' : undefined,
                }}
              >
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <Dot key={i} i={i} />
                ))}
              </div>

              <div
                style={{
                  textAlign: 'center',
                  minHeight: 18,
                  fontSize: 12,
                  color: error ? '#A04A2E' : colors.muted,
                  fontWeight: 600,
                  letterSpacing: 0.2,
                  marginBottom: 14,
                }}
              >
                {busy
                  ? t('login.signingIn')
                  : (error ?? (HAS_SUPABASE ? '' : t('login.demoHint')))}
              </div>

              <Keypad
                onPress={press}
                onClear={clear}
                onBackspace={back}
                disabled={busy}
              />

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 14,
                  fontSize: 12.5,
                  color: colors.muted,
                  fontWeight: 600,
                  justifyContent: 'center',
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => handleRemember(e.target.checked)}
                  className="kt-check"
                />
                {t('login.rememberDevice')}
              </label>

              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <button
                  onClick={deviceEmp ? changeUser : editName}
                  className="kt-tap"
                  style={{
                    fontSize: 12.5,
                    color: colors.muted,
                    fontWeight: 700,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  {deviceEmp
                    ? t('login.notYou', { name: displayFirst })
                    : t('login.editName')}
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 28 }}>
              <NameField
                label={t('login.firstName')}
                value={firstName}
                placeholder={t('login.firstNamePlaceholder')}
                onChange={setFirstName}
                colors={colors}
              />
              <NameField
                label={t('login.lastName')}
                value={lastName}
                placeholder={t('login.lastNamePlaceholder')}
                onChange={setLastName}
                onEnter={goToPin}
                colors={colors}
              />
              {!HAS_SUPABASE && (
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 11.5,
                    color: colors.muted,
                    fontWeight: 600,
                    margin: '4px 0 10px',
                  }}
                >
                  {t('login.demoHint')}
                </div>
              )}
              <button
                onClick={goToPin}
                disabled={!firstName.trim()}
                className="kt-tap"
                style={{
                  width: '100%',
                  height: 54,
                  borderRadius: 14,
                  background: colors.forest,
                  color: '#fff',
                  fontFamily: 'Manrope',
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  marginTop: 6,
                  opacity: !firstName.trim() ? 0.5 : 1,
                }}
              >
                {t('login.continueBtn')}
              </button>
            </div>
          )
        ) : (
          <div style={{ marginTop: 28 }}>
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                border: `1px solid ${colors.line}`,
                padding: '12px 14px',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: colors.goldDeep,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {t('login.emailLabel')}
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                type="email"
                autoCapitalize="none"
                autoCorrect="off"
                className="kt-input"
              />
            </div>
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                border: `1px solid ${colors.line}`,
                padding: '12px 14px',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: colors.goldDeep,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {t('login.passwordLabel')}
              </div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                type="password"
                className="kt-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleEmailLogin();
                }}
              />
            </div>
            <div
              style={{
                textAlign: 'center',
                minHeight: 18,
                fontSize: 12,
                color: error ? '#A04A2E' : colors.muted,
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              {busy ? t('login.signingIn') : (error ?? '')}
            </div>
            <button
              onClick={() => void handleEmailLogin()}
              disabled={busy || email.trim().length < 3 || !password}
              className="kt-tap"
              style={{
                width: '100%',
                height: 54,
                borderRadius: 14,
                background: colors.forest,
                color: '#fff',
                fontFamily: 'Manrope',
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: 0.3,
                opacity: busy || email.trim().length < 3 || !password ? 0.5 : 1,
              }}
            >
              {t('login.signIn')}
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 18, marginBottom: 8 }}>
          <button
            onClick={() => {
              setMode(mode === 'pin' ? 'email' : 'pin');
              setError(null);
            }}
            className="kt-tap"
            style={{
              fontSize: 13,
              color: colors.forest,
              fontWeight: 700,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {mode === 'pin' ? t('login.staffLogin') : t('login.pinLogin')}
          </button>
        </div>

        {!installed && (
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <button
              onClick={() => void handleInstall()}
              className="kt-tap"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                color: colors.goldDeep,
                fontWeight: 700,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5"
                  stroke={colors.goldDeep}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 16h12"
                  stroke={colors.goldDeep}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              {t('profile.installApp')}
            </button>
            {showInstallHint && (
              <div
                style={{
                  fontSize: 11.5,
                  color: colors.muted,
                  marginTop: 6,
                  fontWeight: 500,
                  lineHeight: 1.4,
                  padding: '0 10px',
                }}
              >
                {ios
                  ? t('profile.installIosHint')
                  : t('profile.installHintOther')}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes kt-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(7px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </PhoneFrame>
  );
}

function NameField({
  label,
  value,
  placeholder,
  onChange,
  onEnter,
  colors,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: `1px solid ${colors.line}`,
        padding: '12px 14px',
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: colors.goldDeep,
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoCapitalize="words"
        autoCorrect="off"
        className="kt-input"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter();
        }}
      />
    </div>
  );
}

function Keypad({
  onPress,
  onClear,
  onBackspace,
  disabled,
}: {
  onPress: (d: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const KeyButton = ({ digit, sub }: { digit: string; sub?: string }) => (
    <button
      onClick={() => onPress(digit)}
      disabled={disabled}
      className="kt-tap"
      style={{
        height: 72,
        borderRadius: 18,
        background: '#fff',
        border: `1px solid ${colors.line}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow:
          '0 1px 0 rgba(31,61,43,0.04), 0 3px 10px rgba(31,61,43,0.04)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: colors.charcoal,
          letterSpacing: 0.5,
        }}
      >
        {digit}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: colors.muted,
            letterSpacing: 1.5,
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </button>
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
      }}
    >
      <KeyButton digit="1" />
      <KeyButton digit="2" sub="ABC" />
      <KeyButton digit="3" sub="DEF" />
      <KeyButton digit="4" sub="GHI" />
      <KeyButton digit="5" sub="JKL" />
      <KeyButton digit="6" sub="MNO" />
      <KeyButton digit="7" sub="PQRS" />
      <KeyButton digit="8" sub="TUV" />
      <KeyButton digit="9" sub="WXYZ" />
      <button
        onClick={onBackspace}
        disabled={disabled}
        aria-label={t('common.backspace')}
        className="kt-tap"
        style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
          <path
            d="M8 2h15a1 1 0 011 1v14a1 1 0 01-1 1H8L1 10l7-8z"
            stroke={colors.muted}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M12 7l6 6m0-6l-6 6"
            stroke={colors.muted}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <KeyButton digit="0" />
      <button
        onClick={onClear}
        disabled={disabled}
        className="kt-tap"
        style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: colors.forest,
          letterSpacing: 0.8,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {t('login.clear')}
      </button>
    </div>
  );
}
