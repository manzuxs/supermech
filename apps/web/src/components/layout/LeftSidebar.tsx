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
    <nav
      style={{
        gridArea: 'left',
        borderRight: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        padding: 12,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <h3
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--color-text-secondary)',
          margin: '0 0 4px',
        }}
      >
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
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 10px',
              border: 'none',
              borderRadius: 6,
              background: isActive ? 'var(--color-brand)' : 'transparent',
              color: isActive ? '#fff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              textAlign: 'left',
              opacity: hasFile || isActive ? 1 : 0.5,
              transition: 'background 0.15s',
            }}
          >
            <Icon size={16} />
            <span>{t(labelKey)}</span>
            {hasFile && !isActive && (
              <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>●</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
