import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { useSessionStore } from '../store/session';
import { updateStoredEmployee } from '../lib/auth';
import { initialsOf } from '../lib/format';
import {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  getProfileStats,
  type ProfileStats,
} from '../lib/profile';

function roleKey(role?: string): string {
  return role === 'super_admin'
    ? 'common.roleSuperAdmin'
    : role === 'admin'
      ? 'common.roleAdmin'
      : role === 'supervisor'
        ? 'common.roleSupervisor'
        : 'common.roleEmployee';
}

export function EditProfile() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const employee = useSessionStore((s) => s.employee);
  const setEmployee = useSessionStore((s) => s.setEmployee);

  const [name, setName] = useState(employee?.name ?? '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    employee?.avatar_url ?? null,
  );
  const [stats, setStats] = useState<ProfileStats>({
    cases: 0,
    done: 0,
    active: 0,
    reports: 0,
  });

  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState<null | 'ok' | 'err'>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]);

  async function load() {
    if (!employee?.id) return;
    const [profile, s] = await Promise.all([
      getMyProfile(employee.id),
      getProfileStats(employee.id),
    ]);
    setStats(s);
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone ?? '');
      setEmail(profile.email ?? '');
      setSkills(profile.skills ?? []);
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }

  const avatarColor = employee?.avatar_color ?? colors.forest;
  const shownInitials = useMemo(
    () => (name ? initialsOf(name) : employee?.initials ?? ''),
    [name, employee?.initials],
  );

  async function handlePickPhoto(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(files[0]);
      if (url) setAvatarUrl(url);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function addSkill() {
    const s = newSkill.trim();
    if (!s) return;
    if (!skills.some((x) => x.toLowerCase() === s.toLowerCase())) {
      setSkills([...skills, s]);
    }
    setNewSkill('');
    setAddingSkill(false);
  }

  function removeSkill(s: string) {
    setSkills(skills.filter((x) => x !== s));
  }

  async function handleSave() {
    if (!employee) return;
    setSaving(true);
    setSavedFlash(null);
    try {
      const updated = await updateMyProfile({
        name: name.trim() || employee.name,
        phone: phone.trim() || null,
        email: email.trim() || null,
        skills,
        avatarUrl,
      });
      if (updated) {
        setEmployee(updated);
        updateStoredEmployee(updated);
        setSavedFlash('ok');
        setTimeout(() => navigate('/profile'), 700);
      } else {
        setSavedFlash('err');
      }
    } catch {
      setSavedFlash('err');
    } finally {
      setSaving(false);
    }
  }

  const label = (text: string) => (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        color: colors.goldDeep,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 6,
      }}
    >
      {text}
    </div>
  );

  const inputStyle: CSSProperties = {
    width: '100%',
    background: '#fff',
    borderRadius: 14,
    padding: '13px 14px',
    border: `1px solid ${colors.line}`,
    fontSize: 15,
    fontWeight: 600,
    color: colors.charcoal,
    fontFamily: 'Manrope',
  };

  const stat = (value: number | string, lbl: string) => (
    <div
      style={{
        flex: 1,
        background: '#fff',
        borderRadius: 14,
        border: `1px solid ${colors.line}`,
        padding: '10px 6px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 18,
          fontWeight: 600,
          color: colors.charcoal,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 600,
          color: colors.muted,
          marginTop: 4,
          letterSpacing: 0.3,
        }}
      >
        {lbl}
      </div>
    </div>
  );

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar title={t('profile.editTitle')} onBack={() => navigate('/profile')} />

      <div
        className="kt-scroll"
        style={{
          position: 'absolute',
          top: 110,
          bottom: 0,
          left: 0,
          right: 0,
          overflow: 'auto',
        }}
      >
        {/* Gradient header + avatar */}
        <div
          style={{
            background: `linear-gradient(135deg, ${colors.forest} 0%, #15291d 100%)`,
            padding: '22px 20px 26px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => fileRef.current?.click()}
            className="kt-tap"
            style={{
              position: 'relative',
              width: 96,
              height: 96,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `3px solid ${colors.gold}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: avatarColor,
                  color: '#fff',
                  fontFamily: 'Fraunces, Georgia, serif',
                  fontSize: 32,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `3px solid ${colors.gold}`,
                }}
              >
                {shownInitials}
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                right: 2,
                bottom: 2,
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: colors.gold,
                border: `2px solid #15291d`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 7h2l1.2-1.6h5.6L14 7h2a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z"
                  stroke="#15291d"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="11" r="2.4" stroke="#15291d" strokeWidth="1.5" />
              </svg>
            </div>
          </button>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 600,
              marginTop: 10,
            }}
          >
            {uploading ? t('profile.uploadingPhoto') : t('profile.changePhoto')}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => void handlePickPhoto(e.target.files)}
          />
        </div>

        <div style={{ padding: '18px 20px 40px' }}>
          {/* Name + role */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 22,
                fontWeight: 600,
                color: colors.charcoal,
              }}
            >
              {name || employee?.name}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: colors.goldDeep,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginTop: 4,
              }}
            >
              {t(roleKey(employee?.role))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {stat(stats.cases, t('profile.statCases'))}
            {stat(stats.done, t('profile.statDone'))}
            {stat(stats.active, t('profile.statActive'))}
            {stat(stats.reports, t('profile.statReports'))}
          </div>

          {/* Skills */}
          {label(t('profile.skillsTitle'))}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 22,
            }}
          >
            {skills.map((s) => (
              <div
                key={s}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fff',
                  border: `1px solid ${colors.line}`,
                  borderRadius: 999,
                  padding: '7px 10px 7px 12px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: colors.charcoal,
                }}
              >
                {s}
                <button
                  onClick={() => removeSkill(s)}
                  className="kt-tap"
                  aria-label={`remove ${s}`}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: colors.muted,
                    fontSize: 15,
                    lineHeight: 1,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            {addingSkill ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  autoFocus
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addSkill();
                    if (e.key === 'Escape') {
                      setAddingSkill(false);
                      setNewSkill('');
                    }
                  }}
                  placeholder={t('profile.skillPlaceholder')}
                  className="kt-input"
                  style={{
                    background: '#fff',
                    border: `1px solid ${colors.gold}`,
                    borderRadius: 999,
                    padding: '7px 12px',
                    fontSize: 12.5,
                    fontFamily: 'Manrope',
                    width: 130,
                  }}
                />
                <button
                  onClick={addSkill}
                  className="kt-tap"
                  style={{
                    border: 'none',
                    background: colors.forest,
                    color: '#fff',
                    borderRadius: 999,
                    padding: '7px 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('profile.addSkill')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingSkill(true)}
                className="kt-tap"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'transparent',
                  border: `1.5px dashed ${colors.forest}`,
                  borderRadius: 999,
                  padding: '7px 14px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: colors.forest,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span>
                {t('profile.addSkill')}
              </button>
            )}
          </div>

          {/* Account */}
          {label(t('profile.account'))}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: colors.muted,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginBottom: 5,
              }}
            >
              {t('profile.fullName')}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="kt-input"
              style={inputStyle}
              aria-label={t('profile.fullName')}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: colors.muted,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginBottom: 5,
              }}
            >
              {t('profile.phone')}
            </div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder={t('profile.phonePlaceholder')}
              className="kt-input"
              style={inputStyle}
              aria-label={t('profile.phone')}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: colors.muted,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginBottom: 5,
              }}
            >
              {t('profile.email')}
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={t('profile.emailPlaceholder')}
              className="kt-input"
              style={inputStyle}
              aria-label={t('profile.email')}
            />
          </div>

          {savedFlash && (
            <div
              style={{
                textAlign: 'center',
                fontSize: 12.5,
                fontWeight: 700,
                marginBottom: 12,
                color: savedFlash === 'ok' ? colors.forest : colors.danger,
              }}
            >
              {savedFlash === 'ok' ? t('profile.saved') : t('profile.saveError')}
            </div>
          )}

          <button
            onClick={() => void handleSave()}
            disabled={saving || uploading}
            className="kt-tap"
            style={{
              width: '100%',
              height: 54,
              borderRadius: 14,
              border: 'none',
              background: saving || uploading ? colors.line : colors.forest,
              color: '#fff',
              fontFamily: 'Manrope',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 0.3,
              cursor: saving || uploading ? 'default' : 'pointer',
            }}
          >
            {saving ? t('profile.saving') : t('profile.save')}
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}
