import { BrainCircuit, ClipboardList, type LucideIcon, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SkillType } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

const skills: { key: SkillType; icon: LucideIcon; labelKey: string }[] = [
  { key: 'brainstorming', icon: BrainCircuit, labelKey: 'sidebar.brainstorming' },
  { key: 'writing-plans', icon: ClipboardList, labelKey: 'sidebar.writingPlans' },
  { key: 'executing-plans', icon: PlayCircle, labelKey: 'sidebar.executingPlans' },
];

export default function LogoBar() {
  const { t } = useTranslation();
  const { currentSkill, switchSkill } = useWorkbench();
  const [skillsOpen, setSkillsOpen] = useState(true);

  return (
    <div className="absolute left-4 top-4 z-50 flex items-start gap-2">
      {/* Logo — 点击展开/收起技能 */}
      <button
        type="button"
        onClick={() => setSkillsOpen(!skillsOpen)}
        className="h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-[var(--border)] bg-[var(--bg-main)] shadow-sm transition-all hover:ring-[var(--primary)]/40"
      >
        <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" />
      </button>

      {/* 技能组：图标默认显示，hover 时在同容器内展开名称 */}
      <div
        className={`flex gap-1.5 overflow-hidden transition-all duration-200 ${
          skillsOpen ? 'max-w-[300px] opacity-100' : 'max-w-0 opacity-0'
        }`}
      >
        {skills.map(({ key, icon: Icon, labelKey }) => {
          const isActive = currentSkill === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => switchSkill(key)}
              className={`group flex items-center gap-0 rounded-full border bg-[var(--bg-main)] p-2 transition-all hover:gap-1.5 hover:pr-3 ${
                isActive
                  ? 'border-[var(--primary)]/50 text-[var(--primary)] opacity-100'
                  : 'border-[var(--border)] text-[var(--text-main)] opacity-70 hover:border-[var(--primary)]/30 hover:opacity-100'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium leading-none opacity-0 transition-all duration-200 group-hover:max-w-[120px] group-hover:opacity-100">
                {t(labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
