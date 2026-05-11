import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

export default function RightSidebar() {
  const { t } = useTranslation();
  const { state, addFeedback } = useWorkbench();
  const [text, setText] = useState('');

  const selectedNode = state.ui.selectedNodeId
    ? (state.canvas.nodes.find((n) => n.id === state.ui.selectedNodeId) ?? null)
    : null;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim()) return;
    await addFeedback(state.ui.selectedNodeId ?? '__global__', text.trim());
    setText('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  }

  return (
    <aside className="absolute right-6 top-6 z-20 flex w-80 flex-col gap-6 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-main)]/95 p-5 shadow-2xl backdrop-blur-lg max-h-[calc(100%-48px)] scrollbar-hide">
      {/* Selected Node Info */}
      <div className="flex flex-col gap-5">
        {selectedNode ? (
          <>
            {/* Header: Label as the Hero */}
            <div className="space-y-1">
              <h3 className="text-lg font-bold leading-tight tracking-tight text-[var(--text-main)]">
                {selectedNode.label}
              </h3>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider opacity-40">
                <span>ID: {selectedNode.id}</span>
                <span>•</span>
                <span className="capitalize">{selectedNode.status}</span>
              </div>
            </div>

            {/* Status & Progress Integrated Section */}
            <div className="space-y-3 rounded-xl bg-[var(--border)]/10 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-40">
                  Progress
                </span>
                <span className="text-[13px] font-bold text-[var(--primary)]">
                  {Math.round(selectedNode.progress * 100)}%
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--border)]/30">
                <div 
                  className="h-full bg-[var(--primary)] shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)] transition-all duration-700 ease-out" 
                  style={{ width: `${selectedNode.progress * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                 <div className={`h-1.5 w-1.5 rounded-full ${selectedNode.status === 'done' ? 'bg-green-500' : 'bg-[var(--accent)]'}`} />
                 <span className="text-[11px] font-medium opacity-60 capitalize">{selectedNode.status}</span>
              </div>
            </div>

            {/* Description Area */}
            {(selectedNode.metadata?.description as string) && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                  Description
                </span>
                <p className="text-[13px] leading-relaxed text-[var(--text-main)] opacity-80">
                  {selectedNode.metadata.description as string}
                </p>
              </div>
            )}
            
            {/* Tags as Chips */}
            {Array.isArray(selectedNode.metadata?.tags) &&
              (selectedNode.metadata.tags as string[]).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(selectedNode.metadata.tags as string[]).map(tag => (
                    <span 
                      key={tag} 
                      className="rounded-full border border-[var(--border)] bg-[var(--border)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--text-main)] opacity-70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
             <div className="mb-2 h-10 w-10 rounded-full border-2 border-dashed border-current opacity-20" />
             <p className="text-xs italic">{t('canvas.noSelection')}</p>
          </div>
        )}
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

      {/* Feedback Section */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)] opacity-40">
          {t('sidebar.feedback')}
        </h3>
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('feedback.placeholder')}
            rows={4}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-main)]/40 px-3.5 py-3 text-[13px] text-[var(--text-main)] outline-none transition-all placeholder:opacity-30 focus:border-[var(--primary)] focus:bg-[var(--bg-main)] focus:ring-4 focus:ring-[var(--primary)]/5"
          />
          <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100">
             <kbd className="rounded bg-[var(--border)] px-1.5 py-0.5 text-[9px] font-sans text-muted-foreground">⌘↵</kbd>
          </div>
        </div>
        <button
          type="submit"
          className="group relative flex h-10 items-center justify-center overflow-hidden rounded-xl bg-[var(--primary)] text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:grayscale"
          disabled={!text.trim()}
        >
          <span className="relative z-10">{t('feedback.submit')}</span>
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
        </button>
      </form>
    </aside>
  );
}
