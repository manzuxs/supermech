import { useTranslation } from 'react-i18next';
import type { SkillType } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import KanbanBoard from '../visuals/KanbanBoard.tsx';
import MindMap from '../visuals/MindMap.tsx';

export default function CenterCanvas() {
  const { t } = useTranslation();
  const { state } = useWorkbench();

  if (!state.meta.activeSkill) {
    return (
      <main
        style={{
          gridArea: 'canvas',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-secondary)',
          fontSize: 14,
        }}
      >
        {t('canvas.empty')}
      </main>
    );
  }

  const kanbanTypes: SkillType[] = ['writing-plans', 'executing-plans'];

  return (
    <main
      style={{
        gridArea: 'canvas',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--color-bg)',
      }}
    >
      {state.canvas.nodes.length === 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-secondary)',
            fontSize: 13,
          }}
        >
          {t('canvas.empty')}
        </div>
      ) : kanbanTypes.includes(state.canvas.skillType) ? (
        <KanbanBoard nodes={state.canvas.nodes} edges={state.canvas.edges} />
      ) : (
        <MindMap nodes={state.canvas.nodes} />
      )}
    </main>
  );
}
