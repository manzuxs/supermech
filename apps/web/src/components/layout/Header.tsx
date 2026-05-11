import { Globe, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import i18n from '../../lib/i18n.ts';
import ThemeToggle from './ThemeToggle.tsx';

export default function Header() {
  const { t } = useTranslation();
  const { state, plans, currentPlan, currentSkill, switchPlan, createPlan } = useWorkbench();
  const { meta } = state;

  const statusColors: Record<string, string> = {
    idle: '#737373',
    thinking: '#f59e0b',
    writing: '#3b82f6',
    error: '#ef4444',
  };

  async function handleNewPlan() {
    const name = window.prompt('New plan name:');
    if (name?.trim()) {
      await createPlan(name.trim());
    }
  }

  return (
    <header className="col-span-3 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-main)] px-4">
      <div className="flex items-center gap-3">
        <span className="text-[15px] font-semibold text-[var(--text-main)]">{t('app.title')}</span>
        <span className="max-w-[200px] truncate text-xs text-[var(--text-main)] opacity-60">
          {meta.projectName}
        </span>
        {/* Skill indicator */}
        <span className="rounded bg-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-main)] opacity-60">
          {currentSkill}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Plan selector */}
        <div className="flex items-center gap-1">
          <select
            value={currentPlan}
            onChange={(e) => switchPlan(e.target.value)}
            className="max-w-[180px] rounded-md border border-[var(--border)] bg-[var(--bg-main)] px-2 py-1 text-xs text-[var(--text-main)]"
          >
            <option value="default">default</option>
            {plans
              .filter((p) => p !== 'default')
              .map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
          </select>
          <ActionButton onClick={handleNewPlan} title={t('common.new_plan')}>
            <Plus size={14} />
          </ActionButton>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: statusColors[meta.agentStatus] ?? '#737373' }}
          />
          <span className="text-xs text-[var(--text-main)] opacity-60">
            {t(`footer.${meta.agentStatus}`)}
          </span>
        </div>
        <ActionButton
          onClick={() => {
            const next = i18n.language === 'zh' ? 'en' : 'zh';
            i18n.changeLanguage(next);
          }}
          title={i18n.language === 'zh' ? 'English' : '中文'}
        >
          <Globe size={14} />
        </ActionButton>
        <ThemeToggle />
      </div>
    </header>
  );
}

function ActionButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] bg-transparent p-0 text-[var(--text-main)] opacity-60 hover:opacity-100"
    >
      {children}
    </button>
  );
}
