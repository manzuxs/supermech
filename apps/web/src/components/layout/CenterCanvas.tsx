import { useTranslation } from 'react-i18next';
import type { SkillType } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import KanbanBoard from '../visuals/KanbanBoard.tsx';
import MindMap from '../visuals/MindMap.tsx';
import SwimlaneCanvas from '../visuals/SwimlaneCanvas.tsx';

export default function CenterCanvas() {
  const { t } = useTranslation();
  const { state } = useWorkbench();

  if (!state.meta.activeSkill) {
    return (
      <main className="flex items-center justify-center text-sm text-[var(--text-main)] opacity-50">
        {t('canvas.empty')}
      </main>
    );
  }

  const kanbanTypes: SkillType[] = ['executing-plans'];

  return (
    <main className="relative h-full w-full overflow-hidden bg-[var(--bg-canvas)]">
      {state.canvas.nodes.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[var(--text-main)] opacity-50">
          {t('canvas.empty')}
        </div>
      ) : state.canvas.skillType === 'writing-plans' ? (
        <SwimlaneCanvas />
      ) : kanbanTypes.includes(state.canvas.skillType) ? (
        <KanbanBoard nodes={state.canvas.nodes} edges={state.canvas.edges} />
      ) : (
        <MindMap nodes={state.canvas.nodes} />
      )}
    </main>
  );
}
