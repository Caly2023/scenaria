import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  MoreHorizontal,
  Bot
} from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { ttsService } from '@/services/ttsService';
import { useProject } from '@/contexts/ProjectContext';
import { ScriptDoctorTypingIndicator } from './ScriptDoctorTypingIndicator';
import { ScriptDoctorMessageItem } from './ScriptDoctorMessageItem';

export function ScriptDoctorContent() {
  const project = useProject();
  const {
    handleCloseDoctor: onClose,
    handleDoctorMessage: onSendMessage,
    doctorMessages: messages,
    isDoctorTyping: isTyping,
    isHeavyThinking,
    aiStatus,
    activeStage,
    activeTool,
    currentProject,
    telemetryStatus,
    pendingToolCall,
    handleConfirmTool: onConfirmTool,
    handleCancelTool: onCancelTool
  } = project;

  const projectLanguages = currentProject?.metadata?.languages || ['English'];
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
      // Reset height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Autofocus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300); // Small delay to ensure transitions are finished
    return () => clearTimeout(timer);
  }, []);

  const handleApply = async (msgId: string, action: string) => {
    setIsApplying(msgId);
    onSendMessage(JSON.stringify({ type: 'apply_suggestion', msgId, action }));
    setTimeout(() => {
      setAppliedSuggestions(prev => new Set(prev).add(msgId));
      setIsApplying(null);
    }, 2000);
  };

  const handleTts = (text: string, msgId: string) => {
    if (ttsService.isSpeaking(msgId)) {
      ttsService.cancel();
      setIsSpeaking(null);
      return;
    }
    setIsSpeaking(msgId);
    ttsService.speak(text, msgId, projectLanguages, () => {
      setIsSpeaking(null);
    });
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(messages.length);

  useEffect(() => {
    let scrollTimeout: number | undefined;

    if (messages.length > lastMessageCount.current) {
      const lastMsg = messages[messages.length - 1];
      scrollTimeout = window.setTimeout(() => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const msgElement = document.getElementById(`msg-${lastMsg.id}`);
        if (msgElement) {
          if (lastMsg.role === 'user') {
            msgElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            const containerHeight = container.clientHeight;
            const msgHeight = msgElement.offsetHeight;
            if (msgHeight < containerHeight * 0.8) {
              msgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              msgElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }
      }, 100);
    }

    lastMessageCount.current = messages.length;

    return () => {
      if (scrollTimeout !== undefined) {
        window.clearTimeout(scrollTimeout);
      }
    };
  }, [messages]);

  return (
    <div className="h-full w-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 md:h-14 bg-background/80 backdrop-blur-xl flex items-center justify-between px-5 border-b border-white/5 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white to-[#d0d0d0] text-black flex items-center justify-center shadow-lg shadow-white/5">
            <Bot className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col leading-none">
            <h3 className="text-sm font-bold tracking-tight text-white">{t('common.scriptDoctor')}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[9px] uppercase font-black tracking-widest text-white/40">
                {t('common.analyzing', { stage: t(`stages.${activeStage}.label`, { defaultValue: activeStage }) })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-white/5 transition-all text-white/40 hover:text-white border-none hidden md:block">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white border border-white/10 active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-6 scroll-smooth overscroll-none touch-action-pan-y"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-4">
            <div className="relative">
              <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full animate-pulse" />
              <Sparkles className="w-16 h-16 text-white/20 relative z-10" />
            </div>
            <div className="space-y-2 relative z-10">
              <p className="text-base font-bold text-white/60 tracking-tight">{t('common.analyzingScript')}</p>
              <p className="text-xs text-white/30 max-w-[200px] mx-auto leading-relaxed">{t('common.askForAdvice')}</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ScriptDoctorMessageItem
            key={msg.id}
            msg={msg}
            isApplied={appliedSuggestions.has(msg.id)}
            isApplyingThis={isApplying === msg.id}
            isPendingForThis={pendingToolCall?.botMsgId === msg.id}
            pendingToolCall={pendingToolCall}
            isSpeaking={isSpeaking}
            onConfirmTool={onConfirmTool!}
            onCancelTool={onCancelTool!}
            handleApply={handleApply}
            handleTts={handleTts}
            onSendMessage={onSendMessage}
            messages={messages}
          />
        ))}


        {isTyping && (
          <ScriptDoctorTypingIndicator
            isHeavyThinking={isHeavyThinking}
            aiStatus={aiStatus}
            activeTool={activeTool}
            telemetryStatus={telemetryStatus}
          />
        )}


      </div>

      {/* Input */}
      <form 
        onSubmit={handleSubmit} 
        className="p-4 bg-background flex-shrink-0 border-t border-white/5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        <div className="relative flex items-end gap-2 bg-surface/50 backdrop-blur-md border border-white/10 rounded-[24px] p-1.5 pl-4 transition-all focus-within:border-white/20 focus-within:bg-surface/80 shadow-2xl">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('common.askTheDoctor')}
            rows={1}
            autoFocus
            className="flex-1 bg-transparent border-none outline-none py-2.5 resize-none text-white placeholder:text-white/30 text-base leading-relaxed max-h-[200px] overflow-y-auto"
            style={{ fontSize: '16px' }}
          />
          <button 
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#e5e5e5] transition-all active:scale-95 disabled:opacity-30 disabled:scale-100 border-none shadow-lg mb-0.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
