import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const modes = ['light', 'dark', 'system'] as const;

const icons = { light: Sun, dark: Moon, system: Monitor };

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
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
      title={theme ?? 'system'}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] opacity-70 transition-all hover:opacity-100 ${className}`}
    >
      <Icon size={16} />
    </button>
  );
}
