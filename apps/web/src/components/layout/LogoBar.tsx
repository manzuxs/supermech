import { getBrainstormPlanningReadiness, type SkillType } from '@supermech/schema';
import { type SVGProps, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import SessionSwitcher from './SessionSwitcher.tsx';

type SkillIcon = (props: SVGProps<SVGSVGElement>) => JSX.Element;

function BrainstormIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9.2 14.8h5.6" />
      <path d="M10 17.3h4" />
      <path d="M9.4 19.2h5.2" />
      <path d="M12 4.3a5.4 5.4 0 0 0-3.8 9.2c.8.8 1.3 1.4 1.5 2.1h4.6c.2-.7.7-1.3 1.5-2.1A5.4 5.4 0 0 0 12 4.3Z" />
      <path d="m12 8.1-1.4 2.5h1.6l-.8 2" />
      <path d="M12 1.7v1.5" />
      <path d="m5 4.7 1.1 1.1" />
      <path d="m19 4.7-1.1 1.1" />
      <path d="M3.3 11.2h1.6" />
      <path d="M20.7 11.2h-1.6" />
      <path d="M6 18.4H3.8a1.7 1.7 0 1 1 0-3.4c1 0 1.7.8 1.7 1.7v1.7" />
      <path d="M18 18.4h2.2a1.7 1.7 0 1 0 0-3.4c-1 0-1.7.8-1.7 1.7v1.7" />
      <path d="M12 18.4v2" />
      <circle cx="12" cy="21" r="1.2" />
    </svg>
  );
}

function WritingPlanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="4.4" y="3.7" width="11.6" height="15.2" rx="2.2" />
      <path d="M9 3.7h2.4a1.4 1.4 0 0 1 1.4-1.2h1.1a1.4 1.4 0 0 1 1.4 1.2h.7a1.4 1.4 0 0 1 1.4 1.4v.6" />
      <path d="m7.1 8.6 1.2 1.2 2-2" />
      <path d="M11.7 8.6h2.2" />
      <path d="m7.1 12.2 1.2 1.2 2-2" />
      <path d="M11.7 12.2h2.2" />
      <path d="m7.1 15.8 1.2 1.2 2-2" />
      <path d="M11.7 15.8h2.2" />
      <circle cx="19" cy="14.8" r="2.7" />
      <path d="m18 14.8 1.2 1.2 1.8-1.8" />
      <path d="M16.3 14.8H15" />
    </svg>
  );
}

function ExecutePlanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="6" cy="5.2" r="1.7" />
      <circle cx="6" cy="18.8" r="1.7" />
      <path d="M6 6.9v10.2" />
      <path d="M7.7 12h4.7" />
      <circle cx="18.1" cy="12" r="3.4" />
      <path d="m16.8 12 1 1 1.7-1.9" />
      <path d="M6 12h1.7" />
    </svg>
  );
}

const skills: { key: SkillType; icon: SkillIcon; labelKey: string }[] = [
  { key: 'brainstorming', icon: BrainstormIcon, labelKey: 'sidebar.brainstorming' },
  { key: 'writing-plans', icon: WritingPlanIcon, labelKey: 'sidebar.writingPlans' },
  { key: 'executing-plans', icon: ExecutePlanIcon, labelKey: 'sidebar.executingPlans' },
];

/**
 * 呼吸灯效果动画样式
 */
const pulseStyle = `
  @keyframes skill-pulse {
    0% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.4); }
    70% { box-shadow: 0 0 0 8px rgba(var(--primary-rgb), 0); }
    100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0); }
  }
  .animate-skill-pulse {
    animation: skill-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

export default function LogoBar() {
  const { t } = useTranslation();
  const { currentSkill, switchSkill, state } = useWorkbench();
  const [skillsOpen, setSkillsOpen] = useState(true);
  const toggleSkillsLabel = t('sidebar.toggleSkills', {
    action: skillsOpen ? t('common.hide') : t('common.show'),
  });
  const brainstormingReadiness = getBrainstormPlanningReadiness(state.canvas.nodes);

  return (
    <div className="absolute left-4 top-4 z-50 flex items-start gap-2">
      <style>{pulseStyle}</style>
      {/* Logo — 点击展开/收起技能 */}
      <button
        type="button"
        onClick={() => setSkillsOpen(!skillsOpen)}
        aria-label={toggleSkillsLabel}
        title={toggleSkillsLabel}
        className="h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-[var(--border)] bg-[var(--bg-main)] shadow-sm transition-colors hover:ring-[var(--primary)]/40 focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
      >
        <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" />
      </button>

      {/* 技能组：图标默认显示，hover 时在同容器内展开名称 */}
      <div className="flex items-start gap-1.5">
        <div
          className={`flex gap-1.5 overflow-hidden transition-all duration-200 ${
            skillsOpen ? 'max-w-[320px] opacity-100' : 'max-w-0 opacity-0'
          }`}
        >
          {skills.map(({ key, icon: Icon, labelKey }) => {
            const isActive = currentSkill === key;
            const isWritingPlansBlocked =
              key === 'writing-plans' &&
              currentSkill === 'brainstorming' &&
              state.canvas.skillType === 'brainstorming' &&
              !brainstormingReadiness.canEnterWritingPlans;
            const disabledReason =
              brainstormingReadiness.approvedNodeCount === 0
                ? t('feedback.planTransitionBlockedHint')
                : t('feedback.planTransitionResolveHint');
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (isWritingPlansBlocked) return;
                  void switchSkill(key);
                }}
                disabled={isWritingPlansBlocked}
                aria-label={t(labelKey)}
                title={isWritingPlansBlocked ? disabledReason : t(labelKey)}
                className={`group flex items-center gap-0 rounded-full border bg-[var(--bg-main)] p-2 transition-[gap,padding,opacity,border-color,color] hover:gap-1.5 hover:pr-3 focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 ${
                  isActive
                    ? 'border-[var(--primary)]/50 text-[var(--primary)] opacity-100 animate-skill-pulse'
                    : isWritingPlansBlocked
                      ? 'cursor-not-allowed border-[var(--border)] text-[var(--muted-foreground)] opacity-40'
                      : 'border-[var(--border)] text-[var(--text-main)] opacity-70 hover:border-[var(--primary)]/30 hover:opacity-100'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium leading-none opacity-0 transition-all duration-200 group-hover:max-w-[120px] group-hover:opacity-100">
                  {t(labelKey)}
                </span>
              </button>
            );
          })}
        </div>
        <SessionSwitcher className="shrink-0" />
      </div>
    </div>
  );
}
