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
      className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-xs text-[var(--text-main)] transition-colors hover:bg-[var(--border)]"
    >
      <Icon size={14} className="opacity-70" />
      <span>{t(`theme.${theme}`)}</span>
    </button>
  );
}
