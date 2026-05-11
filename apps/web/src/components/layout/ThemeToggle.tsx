import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const modes = ['light', 'dark', 'system'] as const;

const icons = { light: Sun, dark: Moon, system: Monitor };

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  function cycle() {
    const idx = modes.indexOf(theme as (typeof modes)[number]);
    setTheme(modes[(idx + 1) % modes.length]);
  }

  const Icon = icons[theme as (typeof modes)[number]] ?? Sun;

  return (
    <button
      type="button"
      onClick={cycle}
      title={t(`theme.${theme}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        background: 'transparent',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      <Icon size={14} />
      <span>{t(`theme.${theme}`)}</span>
    </button>
  );
}
