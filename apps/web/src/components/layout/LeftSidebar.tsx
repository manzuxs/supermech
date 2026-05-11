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
    <nav className="flex w-64 flex-col gap-2 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-main)] p-3">
      <h3 className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-main)] opacity-50">
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
            className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
              isActive
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--text-main)] opacity-70 hover:bg-[var(--border)] hover:opacity-100'
            }`}
            style={{ opacity: hasFile || isActive ? 1 : 0.5 }}
          >
            <Icon size={16} />
            <span>{t(labelKey)}</span>
            {hasFile && !isActive && <span className="ml-auto text-[10px] opacity-60">●</span>}
          </button>
        );
      })}
    </nav>
  );
}
