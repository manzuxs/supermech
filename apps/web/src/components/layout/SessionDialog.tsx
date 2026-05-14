import { Check, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';

interface SessionInfo {
  name: string;
  skills: string[];
  current: boolean;
}

interface SessionDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SessionDialog({ open, onClose }: SessionDialogProps) {
  const { t } = useTranslation();
  const { switchPlan, createPlan } = useWorkbench();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSession, setCurrentSession] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/__state/plans')
      .then((r) => r.json())
      .then((data) => {
        const sessionsList: SessionInfo[] = (data.plans ?? []).map((p: string) => ({
          name: p,
          skills: [],
          current: p === data.current,
        }));
        setCurrentSession(data.current ?? '');
        setSessions(sessionsList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  async function handleSwitch(name: string) {
    await switchPlan(name);
    setCurrentSession(name);
    onClose();
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    await createPlan(newName.trim());
    setNewName('');
    await handleSwitch(newName.trim());
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t('session.title')}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="py-8 text-center text-sm text-[var(--text-main)] opacity-50">
              Loading...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--text-main)] opacity-50">
              {t('session.empty')}
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((s) => {
                const isCurrent = s.name === currentSession;
                const isExpanded = expandedId === s.name;
                return (
                  <div key={s.name}>
                    <div
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isCurrent
                          ? 'bg-[var(--surface-2)]'
                          : 'hover:bg-[var(--surface-1)] cursor-pointer'
                      }`}
                      onClick={() => !isCurrent && handleSwitch(s.name)}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(s.name);
                        }}
                        className="flex h-5 w-5 items-center justify-center text-[var(--text-main)] opacity-40 hover:opacity-80"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      <span className="flex-1 truncate font-medium text-[var(--text-main)]">
                        {s.name === 'default' ? 'Default' : s.name}
                      </span>

                      {isCurrent && (
                        <span className="flex items-center gap-1 text-xs text-[var(--primary)]">
                          <Check size={12} />
                          {t('session.current')}
                        </span>
                      )}
                    </div>

                    {/* 展开详情 */}
                    {isExpanded && s.skills.length > 0 && (
                      <div className="ml-8 mb-1 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2">
                        <div className="text-xs text-[var(--text-main)] opacity-50">
                          {t('session.skills', { count: s.skills.length })}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {s.skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-md border border-[var(--border)] bg-[var(--bg-main)] px-2 py-0.5 text-[11px] text-[var(--text-main)] opacity-70"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 新建会话 */}
        <div className="flex items-center gap-2 border-t border-[var(--border)] pt-4">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('session.newPlaceholder')}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            <Plus size={14} className="mr-1" />
            {t('common.create')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
