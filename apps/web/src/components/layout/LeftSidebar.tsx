import { BrainCircuit, ClipboardList, type LucideIcon, PlayCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SkillType } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

const skills: { key: SkillType; icon: LucideIcon; labelKey: string }[] = [
  { key: 'brainstorming', icon: BrainCircuit, labelKey: 'sidebar.brainstorming' },
  { key: 'writing-plans', icon: ClipboardList, labelKey: 'sidebar.writingPlans' },
  { key: 'executing-plans', icon: PlayCircle, labelKey: 'sidebar.executingPlans' },
];

export default function LeftSidebar() {
  const { t } = useTranslation();
  const { state, currentSkill, skills: availableSkills, switchSkill } = useWorkbench();
  const { activeSkill } = state.meta;

  return (
    <nav className="flex w-64 flex-col gap-1.5 overflow-y-auto border-r border-[var(--border)] bg-[var(--background)] p-4">
      <h3 className="mb-2 px-3 text-eyebrow uppercase text-[var(--muted-foreground)]">
        {t('sidebar.skills')}
      </h3>

      {skills.map(({ key, icon: Icon, labelKey }) => {
        const isActive = activeSkill === key || currentSkill === key;
        const hasFile = availableSkills.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => switchSkill(key)}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-all ${
              isActive
                ? 'bg-[var(--surface-2)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_var(--border)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-1)] hover:text-[var(--foreground)]'
            }`}
            style={{ opacity: hasFile || isActive ? 1 : 0.4 }}
          >
            <Icon size={16} className={isActive ? 'text-[var(--primary)]' : ''} />
            <span>{t(labelKey)}</span>
            {hasFile && !isActive && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--primary)] opacity-60" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
