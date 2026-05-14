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
    <footer className="col-span-full flex h-8 items-center justify-between border-t border-[var(--border)] bg-[var(--background)] px-6 text-caption text-[var(--muted-foreground)]">
      <div className="flex items-center gap-4">
        <span>
          {t('footer.status')}: <span className="text-[var(--foreground)]">{t(`footer.${state.meta.agentStatus}`)}</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        {totalNodes > 0 && (
          <span>
            {doneNodes}/{totalNodes} <span className="mx-1 opacity-30">·</span> {progress}%
          </span>
        )}
        <span>
          {state.canvas.nodes.length} nodes <span className="mx-1 opacity-30">·</span> {state.feedback.length} feedback
        </span>
      </div>
    </footer>
  );
}
