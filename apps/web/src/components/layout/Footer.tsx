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
    <footer className="col-span-full flex h-8 items-center justify-between border-t border-[var(--border)] bg-[var(--bg-main)] px-4 text-[11px] text-[var(--text-main)] opacity-60">
      <span>
        {t('footer.status')}: {t(`footer.${state.meta.agentStatus}`)}
      </span>

      <span className="flex items-center gap-3">
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
