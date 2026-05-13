import { Globe, Layers, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import i18n from '../../lib/i18n.ts';

export default function Header() {
  const { t } = useTranslation();
  const { state, plans, currentPlan, currentSkill, switchPlan, createPlan } = useWorkbench();
  const { meta } = state;
  const [newPlanName, setNewPlanName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const statusColors: Record<string, string> = {
    idle: '#d0d6e0',
    thinking: '#5e6ad2',
    writing: '#5e6ad2',
    error: '#ef4444',
  };

  async function handleCreatePlan() {
    if (newPlanName.trim()) {
      await createPlan(newPlanName.trim());
      setNewPlanName('');
      setIsDialogOpen(false);
    }
  }

  return (
    <header className="col-span-full flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-main)] px-4">
      <div className="flex items-center gap-3">
        <span className="text-[15px] font-semibold text-[var(--text-main)]">{t('app.title')}</span>
        <span className="max-w-[200px] truncate text-xs text-[var(--text-main)] opacity-60">
          {meta.projectName}
        </span>
        {/* Skill indicator */}
        <span className="rounded bg-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-main)] opacity-60">
          {currentSkill}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Plan selector */}
        <div className="flex items-center gap-2">
          <Select value={currentPlan} onValueChange={switchPlan}>
            <SelectTrigger className="h-8 border-none bg-transparent px-2 text-xs font-medium hover:bg-accent/50 focus:ring-0">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-muted-foreground" />
                <SelectValue placeholder={t('common.select_plan')} />
              </div>
            </SelectTrigger>
            <SelectContent align="end" className="min-w-[180px]">
              <SelectItem value="default">default</SelectItem>
              {plans
                .filter((p) => p !== 'default')
                .map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                title={t('common.new_plan')}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-[var(--text-main)] opacity-60 hover:bg-accent/50 hover:opacity-100"
              >
                <Plus size={16} />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t('common.new_plan')}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    {t('common.name')}
                  </Label>
                  <Input
                    id="name"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    className="col-span-3"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreatePlan();
                    }}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreatePlan}>{t('common.create')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: statusColors[meta.agentStatus] ?? '#737373' }}
          />
          <span className="text-xs text-[var(--text-main)] opacity-60">
            {t(`footer.${meta.agentStatus}`)}
          </span>
        </div>
        <ActionButton
          onClick={() => {
            const next = i18n.language === 'zh' ? 'en' : 'zh';
            i18n.changeLanguage(next);
          }}
          title={i18n.language === 'zh' ? 'English' : '中文'}
        >
          <Globe size={14} />
        </ActionButton>
      </div>
    </header>
  );
}

function ActionButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] bg-transparent p-0 text-[var(--text-main)] opacity-60 hover:opacity-100"
    >
      {children}
    </button>
  );
}
