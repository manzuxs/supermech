import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const modes = ['light', 'dark', 'system'] as const;

const icons = { light: Sun, dark: Moon, system: Monitor };

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
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
  const themeKey = (theme as (typeof modes)[number]) ?? 'system';
  const label = t('theme.cycle', { mode: t(`theme.${themeKey}`) });

  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 ${className}`}
    >
      <Icon size={16} />
    </button>
  );
}
