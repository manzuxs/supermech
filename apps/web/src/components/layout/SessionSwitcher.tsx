import { ChevronDown, Layers3, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import SessionDialog from './SessionDialog.tsx';

function formatPlanName(name: string) {
  return name === 'default' ? 'Default' : name;
}

interface SessionSwitcherProps {
  className?: string;
}

export default function SessionSwitcher({ className = '' }: SessionSwitcherProps) {
  const { t } = useTranslation();
  const { plans, currentPlan, switchPlan } = useWorkbench();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const filteredPlans = plans.filter((plan) =>
    formatPlanName(plan).toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  async function handleSwitch(plan: string) {
    if (plan === currentPlan) {
      setOpen(false);
      return;
    }
    await switchPlan(plan);
    setOpen(false);
  }

  return (
    <>
      <div ref={rootRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={t('session.switcherLabel')}
          className={`group flex h-[34px] items-center gap-1.5 rounded-full border bg-[var(--bg-main)] px-3 text-left transition-[border-color,opacity,color] hover:border-[var(--primary)]/30 focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 ${
            open
              ? 'border-[var(--primary)]/45 text-[var(--primary)] opacity-100'
              : 'border-[var(--border)] text-[var(--text-main)] opacity-72 hover:opacity-100'
          }`}
        >
          <Layers3 size={16} className="shrink-0" />
          <span className="max-w-[96px] truncate text-xs font-medium leading-none">
            {formatPlanName(currentPlan)}
          </span>
          <ChevronDown
            size={14}
            className={`shrink-0 opacity-45 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {open && (
          <div className="absolute left-0 top-11 z-50 w-[300px] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-main)] shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <label className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 focus-within:border-[var(--primary)]/35">
                <Search size={14} className="text-[var(--text-main)] opacity-35" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label={t('session.searchPlaceholder')}
                  placeholder={t('session.searchPlaceholder')}
                  className="w-full bg-transparent text-[12px] text-[var(--text-main)] outline-none placeholder:opacity-35"
                />
              </label>
            </div>

            <div className="max-h-[300px] overflow-y-auto px-2 py-2">
              {filteredPlans.length > 0 ? (
                filteredPlans.map((plan) => {
                  const isCurrent = plan === currentPlan;
                  return (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => handleSwitch(plan)}
                      className={`flex w-full items-center rounded-2xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 ${
                        isCurrent
                          ? 'bg-[var(--surface-2)] text-[var(--primary)]'
                          : 'text-[var(--text-main)] hover:bg-[var(--surface-1)]'
                      }`}
                    >
                      <span className="block min-w-0 truncate text-[13px] font-medium">
                        {formatPlanName(plan)}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-6 text-center text-[12px] text-[var(--text-main)] opacity-45">
                  {t('session.noResults')}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setDialogOpen(true);
                  setOpen(false);
                }}
                className="w-full rounded-2xl border border-[var(--border)] px-3 py-2.5 text-[12px] font-medium text-[var(--text-main)] transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
              >
                {t('session.manageAll')}
              </button>
            </div>
          </div>
        )}
      </div>

      <SessionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
