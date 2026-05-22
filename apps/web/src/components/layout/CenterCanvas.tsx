import type { SkillType } from '@supermech/schema';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import SubwayCanvas from '../visuals/SubwayCanvas.tsx';
import MindMap from '../visuals/MindMap.tsx';
import SwimlaneCanvas from '../visuals/SwimlaneCanvas.tsx';

export default function CenterCanvas() {
  const { state } = useWorkbench();

  if (state.canvas.nodes.length === 0) {
    return <main className="canvas-dot-grid h-full w-full bg-[var(--bg-canvas)]" />;
  }

  const kanbanTypes: SkillType[] = ['executing-plans'];

  return (
    <main className="canvas-dot-grid relative h-full w-full bg-[var(--bg-canvas)]">
      {state.canvas.skillType === 'writing-plans' ? (
        <SwimlaneCanvas />
      ) : kanbanTypes.includes(state.canvas.skillType) ? (
        <SubwayCanvas nodes={state.canvas.nodes} />
      ) : (
        <MindMap nodes={state.canvas.nodes} />
      )}
    </main>
  );
}
