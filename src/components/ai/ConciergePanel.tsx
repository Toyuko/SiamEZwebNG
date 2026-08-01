"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ConciergeComposer } from "@/components/ai/ConciergeComposer";
import { ConciergeMessageList } from "@/components/ai/ConciergeMessageList";
import { ConciergeQuickActions } from "@/components/ai/ConciergeQuickActions";
import { fadeInUp, motionTransition, scaleIn } from "@/components/ui/motion";
import type { ConciergeLocale, ConciergeMessage } from "@/lib/ai/types";
import { RotateCcw, Sparkles, X } from "lucide-react";

type Labels = {
  title: string;
  subtitle: string;
  offlineHint: string;
  clear: string;
  book: string;
  empty: string;
  placeholder: string;
  send: string;
  listening: string;
  voiceAria: string;
  voiceUnsupported: string;
  voicePermissionDenied: string;
  voiceNoSpeech: string;
  voiceError: string;
  popular: string;
  startBooking: string;
  help: string;
};

type Props = {
  open: boolean;
  locale: ConciergeLocale;
  messages: ConciergeMessage[];
  isStreaming: boolean;
  llmEnabled: boolean;
  labels: Labels;
  onClose: () => void;
  onSend: (message: string) => void;
  onClear: () => void;
};

export function ConciergePanel({
  open,
  locale,
  messages,
  isStreaming,
  llmEnabled,
  labels,
  onClose,
  onSend,
  onClear,
}: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="concierge-panel"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={motionTransition}
          className="fixed bottom-40 right-4 z-[60] flex h-[min(34rem,calc(100vh-11rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-siam-blue/15 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-950 sm:right-6"
          role="dialog"
          aria-modal="false"
          aria-label={labels.title}
        >
          <motion.header
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={motionTransition}
            className="flex items-start gap-2 bg-gradient-to-br from-siam-blue to-siam-blue-dark px-3 py-3 text-white"
          >
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">{labels.title}</h2>
              <p className="text-[11px] text-white/80">{labels.subtitle}</p>
              {!llmEnabled ? (
                <p className="mt-0.5 text-[10px] text-siam-yellow/95">{labels.offlineHint}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label={labels.clear}
              title={labels.clear}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </motion.header>

          <ConciergeMessageList
            messages={messages}
            bookLabel={labels.book}
            emptyLabel={labels.empty}
          />

          <ConciergeQuickActions
            locale={locale}
            disabled={isStreaming}
            onPrompt={onSend}
            labels={{
              popular: labels.popular,
              startBooking: labels.startBooking,
              help: labels.help,
              book: labels.book,
            }}
          />

          <ConciergeComposer
            locale={locale}
            disabled={isStreaming}
            onSend={onSend}
            labels={{
              placeholder: labels.placeholder,
              send: labels.send,
              listening: labels.listening,
              voiceAria: labels.voiceAria,
              voiceUnsupported: labels.voiceUnsupported,
              voicePermissionDenied: labels.voicePermissionDenied,
              voiceNoSpeech: labels.voiceNoSpeech,
              voiceError: labels.voiceError,
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
