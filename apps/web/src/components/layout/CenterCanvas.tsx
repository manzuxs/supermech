import { useTranslation } from 'react-i18next';
import type { SkillType } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import FlowchartCanvas from '../visuals/FlowchartCanvas.tsx';
import MindMap from '../visuals/MindMap.tsx';
import SwimlaneCanvas from '../visuals/SwimlaneCanvas.tsx';

export default function CenterCanvas() {
  const { t } = useTranslation();
  const { state } = useWorkbench();

  if (state.canvas.nodes.length === 0) {
    return (
      <main className="canvas-dot-grid flex h-full w-full items-center justify-center bg-[var(--bg-canvas)]">
        <div className="text-[13px] text-[var(--text-main)] opacity-50">
          {t('canvas.empty')}
        </div>
      </main>
    );
  }

  const kanbanTypes: SkillType[] = ['executing-plans'];

  return (
    <main className="canvas-dot-grid relative h-full w-full bg-[var(--bg-canvas)]">
      {state.canvas.skillType === 'writing-plans' ? (
        <SwimlaneCanvas />
      ) : kanbanTypes.includes(state.canvas.skillType) ? (
        <FlowchartCanvas nodes={state.canvas.nodes} edges={state.canvas.edges} />
      ) : (
        <MindMap nodes={state.canvas.nodes} />
      )}
    </main>
  );
}
