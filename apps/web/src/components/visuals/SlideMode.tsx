import { AlertCircle, Clock, Code, FileText, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CanvasNode, ImplementationStep } from 'schemas';

const FILE_TYPE_STYLES: Record<string, string> = {
  create: 'bg-[var(--primary)] text-white border-transparent',
  modify: 'bg-blue-500 text-white border-transparent',
  test: 'bg-[var(--accent)] text-white border-transparent',
  delete: 'bg-destructive text-white border-transparent',
};

interface SlideModeProps {
  nodes: CanvasNode[];
  selectedId: string | null;
  selectNode: (id: string | null) => Promise<void>;
}

export default function SlideMode({ nodes, selectedId, selectNode }: SlideModeProps) {
  const { t } = useTranslation();
  const selectedNode = nodes.find((n) => n.id === selectedId) || nodes[0];

  if (!selectedNode) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--text-main)] opacity-40">
        {t('editor.emptyTasks')}
      </div>
    );
  }

  const meta = selectedNode.metadata || {};
  const goal = (meta.goal as string) || (meta.description as string);
  const steps = (meta.implementationSteps as ImplementationStep[]) || [];
  const riskLevel = meta.riskLevel as string | undefined;
  const estimatedMinutes = meta.estimatedMinutes as number | undefined;
  const assignee = meta.assignee as string | undefined;
  const files = meta.files as Array<{ path: string; type: string; description?: string }> | undefined;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--bg-canvas)]">
      {/* ── LEFT: Slide Outline ── */}
      <div className="scrollbar-hide flex w-64 shrink-0 flex-col space-y-3 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-main)]/50 p-4 backdrop-blur-xl">
        <div className="mb-6 px-2">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--primary)]">
            Outline
          </div>
          <div className="mt-1.5 h-0.5 w-6 bg-[var(--primary)]" />
        </div>
        
        {nodes.map((node, i) => {
          const isActive = node.id === selectedId;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => selectNode(node.id)}
              className={`group relative flex w-full flex-col gap-2 rounded-xl border p-3.5 text-left transition-all duration-500 ${
                isActive
                  ? 'border-[var(--primary)] bg-[var(--bg-main)] shadow-2xl shadow-[var(--primary)]/10 ring-1 ring-[var(--primary)]/20'
                  : 'border-transparent hover:bg-[var(--bg-main)]/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] font-black ${isActive ? 'text-[var(--primary)]' : 'opacity-20'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className={`h-px flex-1 ${isActive ? 'bg-[var(--primary)]/20' : 'bg-[var(--border)]/50'}`} />
              </div>
              <span className={`line-clamp-2 text-[11px] font-bold leading-snug ${isActive ? 'text-[var(--text-main)]' : 'text-[var(--text-main)] opacity-40 group-hover:opacity-100'}`}>
                {node.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── CENTER: Presentation Stage ── */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Stage Radial Gradient + Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--bg-main)_0%,transparent_100%)] opacity-40" />
        <div className="canvas-dot-grid absolute inset-0 opacity-[0.03]" />
        
        <div className="relative z-10 flex h-full flex-col">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-main)]/10 px-12 py-5 backdrop-blur-md lg:px-20">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3 pr-2 border-r border-[var(--border)]/50">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--success)] shadow-[0_0_8px_var(--success)] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">System Active</span>
              </div>
              
              {estimatedMinutes && (
                <div className="flex items-center gap-2 text-[var(--text-main)] opacity-60">
                  <Clock size={12} className="text-[var(--primary)]" />
                  <span className="text-[10px] font-black">{estimatedMinutes} MIN</span>
                </div>
              )}
              
              {riskLevel && (
                <div className={`flex items-center gap-2 ${
                  riskLevel === 'high' ? 'text-destructive' : riskLevel === 'medium' ? 'text-[var(--accent)]' : 'text-[var(--success)]'
                }`}>
                  <AlertCircle size={12} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{riskLevel} RISK</span>
                </div>
              )}

              {assignee && (
                <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-main)]/50 px-3 py-1 text-[var(--text-main)] shadow-sm transition-all hover:border-[var(--primary)]/30">
                  <User size={10} className="text-[var(--primary)]" />
                  <span className="text-[9px] font-black tracking-widest">{assignee.toUpperCase()}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Spacer for view toggle which is absolute positioned in PlanEditor at top-4 right-4 */}
              <div className="w-24" />
            </div>
          </div>

          {/* Dynamic Content Grid */}
          <div className="flex-1 overflow-y-auto px-12 py-12 lg:px-20 lg:py-20">
            <div className="mx-auto max-w-6xl">
              <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1.2fr_1fr]">
                
                {/* Section A: Narrative */}
                <div className="flex flex-col space-y-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[var(--primary)]">
                      <div className="h-0.5 w-6 bg-current" />
                      <span className="font-mono text-xs font-black tracking-tighter">PHASE 0{Math.floor(nodes.indexOf(selectedNode) / 3) + 1}</span>
                    </div>
                    <h1 className="font-heading text-6xl font-bold leading-[1.05] tracking-tight text-[var(--text-main)] lg:text-8xl">
                      {selectedNode.label}
                    </h1>
                  </div>

                  {goal && (
                    <div className="relative rounded-3xl border border-[var(--border)] bg-[var(--bg-main)]/60 p-10 shadow-2xl shadow-black/5">
                      <div className="absolute -left-px top-10 bottom-10 w-1.5 rounded-full bg-[var(--primary)]" />
                      <p className="text-xl font-medium leading-relaxed text-[var(--text-main)] opacity-90 lg:text-2xl">
                        {goal}
                      </p>
                    </div>
                  )}
                </div>

                {/* Section B: Logic & Assets */}
                <div className="space-y-12">
                  {/* Implementation Logic */}
                  {steps.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-main)] opacity-30">
                        <Code size={16} />
                        Implementation Logic
                      </h3>
                      <div className="space-y-3">
                        {steps.map((step, i) => (
                          <div key={i} className="group flex items-center gap-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-main)] p-4 transition-all duration-500 hover:border-[var(--primary)]/40 hover:shadow-xl hover:shadow-[var(--primary)]/5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 font-mono text-[10px] font-black text-[var(--primary)] transition-all duration-500 group-hover:scale-110 group-hover:bg-[var(--primary)] group-hover:text-white">
                              {i + 1}
                            </span>
                            <p className="text-[13px] font-bold leading-snug text-[var(--text-main)] opacity-80 transition-opacity group-hover:opacity-100">
                              {step.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Structural Assets */}
                  {files && files.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-main)] opacity-30">
                        <FileText size={16} />
                        Structural Assets
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {files.map((f) => (
                          <div key={f.path} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-main)]/80 p-3.5 backdrop-blur-md transition-all duration-500 hover:border-[var(--primary)]/30 hover:bg-[var(--bg-main)]">
                            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${FILE_TYPE_STYLES[f.type] || ''}`}>
                              {f.type}
                            </span>
                            <code className="truncate font-mono text-[10px] font-black opacity-50">{f.path.split('/').pop()}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
