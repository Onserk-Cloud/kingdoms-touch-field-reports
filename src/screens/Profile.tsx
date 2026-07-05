import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { TabBar, AdminTabBar } from '../components/TabBar';
import { LogoMark } from '../components/LogoMark';
import { SecondaryButton } from '../components/Button';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { useSessionStore } from '../store/session';
import { useInstall } from '../lib/pwa-install';
import { initialsOf } from '../lib/format';
import { HAS_SUPABASE } from '../lib/supabase';
import { getMyProfile } from '../lib/profile';
import { updateStoredEmployee } from '../lib/auth';
import { resetDemoSeed, seedDemoData } from '../lib/seed-demo';
import { ktStore } from '../lib/offline-store';

export function Profile() {
  const { colors } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const employee = useSessionStore((s) => s.employee);
  const setEmployee = useSessionStore((s) => s.setEmployee);
  const logout = useSessionStore((s) => s.logout);
  const { installed, ios, promptInstall } = useInstall();
  const [showInstallHint, setShowInstallHint] = useState(false);

  // Pull the full profile (avatar/phone/email/skills) once so the header
  // shows a photo and edits round-trip without a re-login.
  useEffect(() => {
    if (!HAS_SUPABASE || !employee?.id) return;
    let alive = true;
    void getMyProfile(employee.id).then((full) => {
      if (alive && full) {
        setEmployee(full);
        updateStoredEmployee(full);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]);

  const handleInstall = async () => {
    // Always try the native prompt; fall back to instructions if unavailable.
    const ok = await promptInstall();
    if (!ok) setShowInstallHint(true);
  };

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar title={t('profile.title')} back={false} />

      <div
        className="kt-scroll"
        style={{
          position: 'absolute',
          top: 110,
          bottom: 92,
          left: 0,
          right: 0,
          overflow: 'auto',
          padding: '18px 20px 30px',
        }}
      >
        {employee && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/profile/edit')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/profile/edit');
              }
            }}
            className="kt-tap"
            style={{
              background: '#fff',
              borderRadius: 18,
              padding: 18,
              border: `1px solid ${colors.line}`,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 18,
              cursor: 'pointer',
            }}
          >
            {employee.avatar_url ? (
              <img
                src={employee.avatar_url}
                alt=""
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: employee.avatar_color ?? colors.forest,
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
                  flexShrink: 0,
                }}
              >
                {employee.initials || initialsOf(employee.name)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'Fraunces, Georgia, serif',
                  fontSize: 22,
                  fontWeight: 500,
                  color: colors.charcoal,
                  letterSpacing: -0.3,
                }}
              >
                {employee.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: colors.goldDeep,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                {t(
                  employee.role === 'super_admin'
                    ? 'common.roleSuperAdmin'
                    : employee.role === 'admin'
                      ? 'common.roleAdmin'
                      : employee.role === 'supervisor'
                        ? 'common.roleSupervisor'
                        : 'common.roleEmployee',
                )}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: colors.forest,
                  marginTop: 6,
                }}
              >
                {t('profile.editProfile')} ›
              </div>
            </div>
          </div>
        )}

        {!installed && (
          <div
            style={{
              background: '#fff',
              borderRadius: 18,
              padding: 16,
              border: `1px solid ${colors.line}`,
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldDeep} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 16h12"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: colors.charcoal,
                  }}
                >
                  {t('profile.installApp')}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: colors.muted,
                    marginTop: 2,
                    fontWeight: 500,
                    lineHeight: 1.35,
                  }}
                >
                  {t('profile.installSub')}
                </div>
              </div>
            </div>
            <button
              onClick={() => void handleInstall()}
              className="kt-tap"
              style={{
                marginTop: 12,
                width: '100%',
                height: 46,
                borderRadius: 12,
                background: colors.forest,
                color: '#fff',
                fontFamily: 'Manrope',
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: 0.3,
              }}
            >
              {t('profile.installApp')}
            </button>
            {showInstallHint && (
              <div
                style={{
                  fontSize: 12.5,
                  color: colors.muted,
                  marginTop: 10,
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {ios
                  ? t('profile.installIosHint')
                  : t('profile.installHintOther')}
              </div>
            )}
          </div>
        )}
        {installed && (
          <div
            style={{
              fontSize: 12.5,
              color: colors.forest,
              fontWeight: 700,
              marginBottom: 18,
              textAlign: 'center',
            }}
          >
            {t('profile.installInstalled')}
          </div>
        )}

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.goldDeep,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            margin: '8px 0 10px',
          }}
        >
          {t('profile.language')}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {(['en', 'es'] as const).map((lng) => {
            const active = locale === lng;
            return (
              <button
                key={lng}
                onClick={() => setLocale(lng)}
                className="kt-tap"
                style={{
                  flex: 1,
                  padding: '12px 10px',
                  borderRadius: 14,
                  background: '#fff',
                  border: `2px solid ${active ? colors.gold : colors.line}`,
                  fontFamily: 'Manrope',
                  fontSize: 13,
                  fontWeight: 700,
                  color: active ? colors.forest : colors.muted,
                }}
              >
                {lng === 'en' ? 'English' : 'Español'}
              </button>
            );
          })}
        </div>

        {employee && employee.role !== 'employee' && (
          <SecondaryButton onClick={() => navigate('/supervisor')}>
            {t('profile.goToSupervisor')}
          </SecondaryButton>
        )}
        {employee &&
          (employee.role === 'admin' || employee.role === 'super_admin') && (
            <SecondaryButton onClick={() => navigate('/manage')}>
              {t('profile.manageTeam')}
            </SecondaryButton>
          )}
        {employee?.role === 'employee' && (
          <SecondaryButton onClick={() => navigate('/my-reports')}>
            {t('profile.viewMyReports')}
          </SecondaryButton>
        )}
        <SecondaryButton onClick={() => navigate('/help')}>
          {t('profile.userManual')}
        </SecondaryButton>

        {!HAS_SUPABASE && (
          <>
            <div style={{ height: 10 }} />
            <SecondaryButton
              onClick={async () => {
                await ktStore.clear();
                resetDemoSeed();
                await seedDemoData(true);
                window.location.reload();
              }}
            >
              {t('profile.resetDemo')}
            </SecondaryButton>
          </>
        )}

        <div style={{ height: 18 }} />

        <button
          onClick={async () => {
            await logout();
            navigate('/', { replace: true });
          }}
          className="kt-tap"
          style={{
            width: '100%',
            height: 54,
            borderRadius: 14,
            background: '#fff',
            border: `1.5px solid ${colors.dangerLine}`,
            color: colors.danger,
            fontFamily: 'Manrope',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 0.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {t('profile.signOut')}
        </button>

        <div
          style={{
            marginTop: 28,
            textAlign: 'center',
            opacity: 0.55,
          }}
        >
          <LogoMark size={20} variant="gold" />
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: colors.muted,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginTop: 6,
            }}
          >
            Kingdoms Touch Services · v 2.5
          </div>
        </div>
      </div>
      {employee && employee.role !== 'employee' ? (
        <AdminTabBar active="settings" />
      ) : (
        <TabBar active="profile" />
      )}
    </PhoneFrame>
  );
}
