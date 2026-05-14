import type { SkillType } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import FlowchartCanvas from '../visuals/FlowchartCanvas.tsx';
import MindMap from '../visuals/MindMap.tsx';
import SwimlaneCanvas from '../visuals/SwimlaneCanvas.tsx';

export default function CenterCanvas() {
  const { state } = useWorkbench();

  if (state.canvas.nodes.length === 0) {
    return (
      <main className="canvas-dot-grid h-full w-full bg-[var(--bg-canvas)]" />
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
