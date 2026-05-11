import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NodeStatus } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

const QUICK_ACTION_STATUS: Record<string, NodeStatus> = {
  approve: 'accepted',
  reject: 'rejected',
  revise: 'active',
  expand: 'active',
};

export default function RightSidebar() {
  const { t } = useTranslation();
  const { state, addFeedback, updateNode } = useWorkbench();
  const [text, setText] = useState('');

  const selectedNode = state.ui.selectedNodeId
    ? (state.canvas.nodes.find((n) => n.id === state.ui.selectedNodeId) ?? null)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await addFeedback(state.ui.selectedNodeId ?? '__global__', text.trim());
    setText('');
  }

  async function handleQuickAction(action: string) {
    const nodeId = state.ui.selectedNodeId ?? '__global__';
    await addFeedback(nodeId, '', action);
    if (selectedNode && QUICK_ACTION_STATUS[action]) {
      await updateNode(selectedNode.id, { status: QUICK_ACTION_STATUS[action] });
    }
  }

  return (
    <aside
      style={{
        gridArea: 'right',
        borderLeft: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
      }}
    >
      {/* Selected Node Info */}
      <div>
        <h3
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-secondary)',
            margin: '0 0 8px',
          }}
        >
          Properties
        </h3>
        {selectedNode ? (
          <div
            style={{
              fontSize: 13,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div>
              <strong>ID:</strong> {selectedNode.id}
            </div>
            <div>
              <strong>Label:</strong> {selectedNode.label}
            </div>
            <div>
              <strong>Status:</strong> {selectedNode.status}
            </div>
            <div>
              <strong>Progress:</strong> {Math.round(selectedNode.progress * 100)}%
            </div>
          </div>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('canvas.noSelection')}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-secondary)',
            margin: '0 0 8px',
          }}
        >
          Quick Actions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {['approve', 'reject', 'revise', 'expand'].map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleQuickAction(action)}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                background: 'transparent',
                color: 'var(--color-text)',
                cursor: 'pointer',
                fontSize: 12,
                textAlign: 'left',
                textTransform: 'capitalize',
              }}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Input */}
      <form onSubmit={handleSubmit} style={{ marginTop: 'auto' }}>
        <h3
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-secondary)',
            margin: '0 0 8px',
          }}
        >
          Feedback
        </h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('feedback.placeholder')}
          rows={3}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: 12,
            resize: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="submit"
          style={{
            marginTop: 6,
            padding: '6px 12px',
            border: 'none',
            borderRadius: 6,
            background: 'var(--color-brand)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          {t('feedback.submit')}
        </button>
      </form>
    </aside>
  );
}
