import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';

export type TabKey = 'home' | 'reports' | 'new' | 'profile';

interface TabBarProps {
  active: TabKey;
}

interface AdminTab {
  k: 'overview' | 'cases' | 'settings';
  label: string;
  icon: ReactNode;
  to: string;
}

interface EmployeeTab {
  k: TabKey;
  label: string;
  icon: ReactNode;
  to: string;
}

export function TabBar({ active }: TabBarProps) {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const { t } = useI18n();

  const tabs: EmployeeTab[] = [
    {
      k: 'home',
      label: t('tabBar.home'),
      to: '/home',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path
            d="M3 9l8-6 8 6v10a1 1 0 01-1 1h-4v-6H8v6H4a1 1 0 01-1-1V9z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      k: 'reports',
      label: t('tabBar.reports'),
      to: '/my-reports',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect
            x="4"
            y="3"
            width="14"
            height="16"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M7 8h8M7 12h8M7 16h5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      k: 'new',
      label: t('tabBar.new'),
      to: '/new-report',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle
            cx="11"
            cy="11"
            r="8.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M11 7v8M7 11h8"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      k: 'profile',
      label: t('tabBar.profile'),
      to: '/profile',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle
            cx="11"
            cy="8"
            r="3.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M3.5 19c1.5-4 4.5-6 7.5-6s6 2 7.5 6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 92,
        background: '#fff',
        borderTop: `1px solid ${colors.line}`,
        display: 'flex',
        paddingBottom: 26,
        paddingLeft: 8,
        paddingRight: 8,
      }}
      className="kt-safe-bottom"
    >
      {tabs.map((tab) => {
        const on = active === tab.k;
        const c = on ? colors.forest : colors.muted;
        return (
          <button
            key={tab.k}
            onClick={() => navigate(tab.to)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              paddingTop: 12,
              position: 'relative',
              color: c,
              // Full-height tappable target (>=44px) without changing layout.
              alignSelf: 'stretch',
              minHeight: 44,
            }}
            className="kt-tap"
          >
            {on && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  width: 28,
                  height: 3,
                  background: colors.gold,
                  borderRadius: 2,
                }}
              />
            )}
            {tab.icon}
            <div
              style={{
                fontSize: 10.5,
                fontWeight: on ? 700 : 500,
                color: c,
                letterSpacing: 0.2,
              }}
            >
              {tab.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function AdminTabBar({ active }: { active: AdminTab['k'] }) {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const { t } = useI18n();

  const tabs: AdminTab[] = [
    {
      k: 'overview',
      label: t('tabBar.overview'),
      to: '/supervisor',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="1.6"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <rect
            x="12"
            y="3"
            width="7"
            height="7"
            rx="1.6"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <rect
            x="3"
            y="12"
            width="7"
            height="7"
            rx="1.6"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <rect
            x="12"
            y="12"
            width="7"
            height="7"
            rx="1.6"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      ),
    },
    {
      k: 'cases',
      label: t('tabBar.cases'),
      to: '/cases',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect
            x="3"
            y="6"
            width="16"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M8 6V4.6A1.6 1.6 0 019.6 3h2.8A1.6 1.6 0 0114 4.6V6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      k: 'settings',
      label: t('tabBar.settings'),
      to: '/profile',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle
            cx="11"
            cy="11"
            r="3"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M11 2v3M11 17v3M2 11h3M17 11h3M4.5 4.5l2 2M15.5 15.5l2 2M4.5 17.5l2-2M15.5 6.5l2-2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 92,
        background: '#fff',
        borderTop: `1px solid ${colors.line}`,
        display: 'flex',
        paddingBottom: 26,
        paddingLeft: 8,
        paddingRight: 8,
      }}
      className="kt-safe-bottom"
    >
      {tabs.map((tab) => {
        const on = active === tab.k;
        const c = on ? colors.forest : colors.muted;
        return (
          <button
            key={tab.k}
            onClick={() => navigate(tab.to)}
            className="kt-tap"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              paddingTop: 12,
              position: 'relative',
              color: c,
              // Full-height tappable target (>=44px) without changing layout.
              alignSelf: 'stretch',
              minHeight: 44,
            }}
          >
            {on && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  width: 28,
                  height: 3,
                  background: colors.gold,
                  borderRadius: 2,
                }}
              />
            )}
            {tab.icon}
            <div
              style={{
                fontSize: 10.5,
                fontWeight: on ? 700 : 500,
                color: c,
                letterSpacing: 0.2,
              }}
            >
              {tab.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
