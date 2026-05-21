import { Check, ChevronDown, ChevronRight, Copy, Download, FileInput, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const { switchPlan, createPlan, renamePlan, duplicatePlan, deletePlan, exportPlan, importPlan } = useWorkbench();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSession, setCurrentSession] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [duplicateValue, setDuplicateValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleRename(from: string) {
    if (!renameValue.trim() || renameValue.trim() === from) {
      setRenamingId(null);
      return;
    }
    await renamePlan(from, renameValue.trim());
    setRenamingId(null);
    if (from === currentSession) setCurrentSession(renameValue.trim());
    refreshSessions();
  }

  async function handleDuplicate(from: string) {
    if (!duplicateValue.trim()) {
      setDuplicatingId(null);
      return;
    }
    await duplicatePlan(from, duplicateValue.trim());
    setDuplicatingId(null);
    refreshSessions();
  }

  async function handleDelete(name: string) {
    await deletePlan(name);
    setConfirmDeleteId(null);
    refreshSessions();
  }

  async function handleExport(name: string) {
    const data = await exportPlan(name);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.supermech.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpenId(null);
  }

  async function handleImport(file: File) {
    const text = await file.text();
    const payload = JSON.parse(text);
    await importPlan(payload);
    refreshSessions();
  }

  async function refreshSessions() {
    setLoading(true);
    try {
      const res = await fetch('/__state/plans');
      const data = await res.json();
      const sessionsList: SessionInfo[] = (data.plans ?? []).map((p: string) => ({
        name: p,
        skills: [],
        current: p === data.current,
      }));
      setCurrentSession(data.current ?? '');
      setSessions(sessionsList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t('session.title')}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="py-8 text-center text-sm text-[var(--text-main)] opacity-50">
              {t('common.loading', { defaultValue: 'Loading...' })}
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
                const isRenaming = renamingId === s.name;
                const isDuplicating = duplicatingId === s.name;
                const isDefault = s.name === 'default';
                return (
                  <div key={s.name}>
                    <div
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isCurrent ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-1)]'
                      }`}
                    >
                      <button
                        type="button"
                        aria-label={t(isExpanded ? 'session.collapse' : 'session.expand')}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(s.name);
                        }}
                        className="flex h-5 w-5 items-center justify-center text-[var(--text-main)] opacity-40 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      {isRenaming ? (
                        <div className="flex flex-1 items-center gap-1">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            placeholder={t('session.renamePlaceholder')}
                            className="flex-1 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(s.name);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                          />
                          <Button size="sm" onClick={() => handleRename(s.name)}>
                            {t('session.renameAction')}
                          </Button>
                        </div>
                      ) : isDuplicating ? (
                        <div className="flex flex-1 items-center gap-1">
                          <Input
                            value={duplicateValue}
                            onChange={(e) => setDuplicateValue(e.target.value)}
                            placeholder={t('session.nameInputLabel')}
                            className="flex-1 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleDuplicate(s.name);
                              if (e.key === 'Escape') setDuplicatingId(null);
                            }}
                          />
                          <Button size="sm" onClick={() => handleDuplicate(s.name)}>
                            {t('session.duplicateAction')}
                          </Button>
                        </div>
                      ) : confirmDeleteId === s.name ? (
                        <div className="flex flex-1 items-center gap-1 text-xs text-red-500">
                          <span className="flex-1 truncate">{t('session.confirmDelete', { name: s.name })}</span>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(s.name)}>
                            {t('session.delete')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                            {t('common.cancel')}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => !isCurrent && handleSwitch(s.name)}
                            className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 disabled:cursor-default"
                          >
                            <span className="flex-1 truncate font-medium text-[var(--text-main)]">
                              {isDefault ? t('session.default') : s.name}
                            </span>

                            {isCurrent && (
                              <span className="flex items-center gap-1 text-xs text-[var(--primary)]">
                                <Check size={12} />
                                {t('session.current')}
                              </span>
                            )}
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              aria-label={t('session.moreActions')}
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === s.name ? null : s.name);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-main)] opacity-0 hover:opacity-100 group-hover:opacity-100 hover:bg-[var(--surface-2)] transition-opacity"
                              style={{ opacity: menuOpenId === s.name ? 1 : undefined }}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {menuOpenId === s.name && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setMenuOpenId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-xl border border-[var(--border)] bg-[var(--bg-main)] shadow-lg py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuOpenId(null);
                                      setRenamingId(s.name);
                                      setRenameValue(s.name);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--surface-1)]"
                                  >
                                    <Pencil size={12} />
                                    {t('session.rename')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuOpenId(null);
                                      setDuplicatingId(s.name);
                                      setDuplicateValue(`${s.name}-copy`);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--surface-1)]"
                                  >
                                    <Copy size={12} />
                                    {t('session.duplicate')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleExport(s.name)}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--surface-1)]"
                                  >
                                    <Download size={12} />
                                    {t('session.export')}
                                  </button>
                                  {!isDefault && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMenuOpenId(null);
                                        setConfirmDeleteId(s.name);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-[var(--surface-1)]"
                                    >
                                      <Trash2 size={12} />
                                      {t('session.delete')}
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </>
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
            aria-label={t('session.nameInputLabel')}
            name="sessionName"
            autoComplete="off"
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

        {/* 导入 */}
        <div className="flex items-center gap-2 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-xs text-[var(--text-main)] opacity-60 hover:opacity-100"
          >
            <FileInput size={14} className="mr-1" />
            {t('session.import')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
