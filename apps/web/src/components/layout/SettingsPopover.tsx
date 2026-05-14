import { Globe, Settings, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../lib/i18n.ts';
import SessionDialog from './SessionDialog.tsx';
import ThemeToggle from './ThemeToggle.tsx';

export default function SettingsPopover() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  function toggleLang() {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
  }

  return (
    <>
      <div className="absolute bottom-4 left-4 z-50 flex flex-col items-center gap-2">
        {/* 向上展开的设置图标组 */}
        <div
          className={`flex flex-col items-center gap-2 transition-all duration-200 ${
            open ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          {/* 会话管理 */}
          <button
            type="button"
            title={t('session.title')}
            aria-label={t('session.title')}
            onClick={() => {
              setSessionOpen(true);
              setOpen(false);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
          >
            <UserRound size={16} />
          </button>

          {/* 主题切换 */}
          <ThemeToggle />

          {/* 语言切换 */}
          <button
            type="button"
            title={i18n.language === 'zh' ? 'English' : '中文'}
            aria-label={i18n.language === 'zh' ? 'English' : '中文'}
            onClick={toggleLang}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
          >
            <Globe size={16} />
          </button>
        </div>

        {/* 齿轮主按钮 */}
        <button
          type="button"
          title={t('common.settings')}
          aria-label={t('common.settings')}
          onClick={() => setOpen(!open)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-[var(--bg-main)] shadow-sm transition-[opacity,border-color,color] focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 ${
            open
              ? 'border-[var(--primary)]/50 text-[var(--primary)] opacity-100'
              : 'border-[var(--border)] text-[var(--text-main)] opacity-40 hover:opacity-80'
          }`}
        >
          <Settings size={18} />
        </button>
      </div>

      <SessionDialog open={sessionOpen} onClose={() => setSessionOpen(false)} />
    </>
  );
}
