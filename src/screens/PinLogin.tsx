import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { LogoMark } from '../components/LogoMark';
import { useTheme } from '../theme-context';
import {
  getRemember,
  setRemember as setRememberPref,
  signInWithPin,
} from '../lib/auth';
import { useSessionStore } from '../store/session';
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

  // Auto-submit once 4 digits are entered.
  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const s = await signInWithPin(pin);
        if (cancelled) return;
        setEmployee(s.employee);
        navigate(s.employee.role === 'employee' ? '/home' : '/supervisor', {
          replace: true,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t('login.loginFailed'));
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
  }, [pin, navigate, setEmployee]);

  const handleRemember = (v: boolean) => {
    setRemember(v);
    setRememberPref(v);
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

  return (
    <PhoneFrame>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '70px 28px 30px',
          display: 'flex',
          flexDirection: 'column',
        }}
        className="kt-safe-top"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={32} variant="gold" />
          <div style={{ lineHeight: 1.1 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: colors.forest,
                letterSpacing: 1.6,
              }}
            >
              KINGDOMS TOUCH
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: colors.muted,
                letterSpacing: 1.2,
              }}
            >
              {t('login.eyebrow')}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: 32,
              fontWeight: 500,
              color: colors.charcoal,
              letterSpacing: -0.6,
              lineHeight: 1.05,
            }}
          >
            {t('login.title')}
          </div>
          <div
            style={{
              fontSize: 14,
              color: colors.muted,
              marginTop: 8,
              fontWeight: 500,
            }}
          >
            {t('login.subtitle')}
          </div>
        </div>

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

        <Keypad onPress={press} onClear={clear} disabled={busy} />

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

        <div style={{ textAlign: 'center', marginTop: 14, marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: colors.muted, fontWeight: 500 }}>
            {t('login.forgotPin')}{' '}
          </span>
          <span
            style={{
              fontSize: 13,
              color: colors.forest,
              fontWeight: 700,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {t('login.contactSupervisor')}
          </span>
        </div>
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

function Keypad({
  onPress,
  onClear,
  disabled,
}: {
  onPress: (d: string) => void;
  onClear: () => void;
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
      <div />
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
