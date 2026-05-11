import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

export default function Footer() {
  const { t } = useTranslation();
  const { state } = useWorkbench();

  const totalNodes = state.canvas.nodes.length;
  const doneNodes = state.canvas.nodes.filter(
    (n) => n.status === 'done' || n.status === 'accepted',
  ).length;
  const progress = totalNodes > 0 ? Math.round((doneNodes / totalNodes) * 100) : 0;

  return (
    <footer
      style={{
        gridArea: 'footer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 28,
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        fontSize: 11,
        color: 'var(--color-text-secondary)',
      }}
    >
      <span>
        {t('footer.status')}: {t(`footer.${state.meta.agentStatus}`)}
      </span>

      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {totalNodes > 0 && (
          <span>
            {doneNodes}/{totalNodes} · {progress}%
          </span>
        )}
        <span>
          {state.canvas.nodes.length} nodes · {state.feedback.length} feedback
        </span>
      </span>
    </footer>
  );
}
