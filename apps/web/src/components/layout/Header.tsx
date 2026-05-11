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
    <header
      style={{
        gridArea: 'header',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 48,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{t('app.title')}</span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {meta.projectName}
        </span>
        {/* Skill indicator */}
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 4,
            background: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {currentSkill}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Plan selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <select
            value={currentPlan}
            onChange={(e) => switchPlan(e.target.value)}
            style={{
              fontSize: 12,
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              maxWidth: 180,
            }}
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
          <ActionButton onClick={handleNewPlan} title="New plan">
            <Plus size={14} />
          </ActionButton>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: statusColors[meta.agentStatus] ?? '#737373',
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
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
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        background: 'transparent',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
