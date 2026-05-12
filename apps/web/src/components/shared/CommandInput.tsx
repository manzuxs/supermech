import { Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCommand } from '../../lib/commands.ts';

interface CommandInputProps {
  onSubmit: (text: string) => void | Promise<void>;
  placeholder?: string;
}

export default function CommandInput({ onSubmit, placeholder }: CommandInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Detect slash commands
    if (trimmed.startsWith('/')) {
      const cmd = getCommand(trimmed.slice(1));
      if (cmd) {
        await cmd.run();
        setText('');
      } else {
        // Unknown command — submit as feedback text
        await onSubmit(trimmed);
        setText('');
      }
      return;
    }

    // Normal feedback
    await onSubmit(trimmed);
    setText('');
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  }

  return (
    <div className="mt-6 border-t border-[var(--border)] pt-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)] opacity-40">
          {t('editor.feedbackTitle')}
        </span>
        {sent && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--primary)]">
            <Check size={10} /> {t('editor.sent')}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit();
          }}
          placeholder={placeholder ?? t('editor.feedbackPlaceholder')}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] px-4 py-2 text-xs text-[var(--text-main)] outline-none transition-colors placeholder:opacity-30 focus:border-[var(--primary)]"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-30"
        >
          {t('editor.send')}
        </button>
      </div>
    </div>
  );
}

export function createOnSubmit(
  addFeedback: (params: {
    nodeId: string;
    text: string;
    section?: string;
    rating?: number;
  }) => Promise<void>,
  nodeId: string,
): (text: string) => Promise<void> {
  return async (text: string) => {
    await addFeedback({ nodeId, text });
  };
}
