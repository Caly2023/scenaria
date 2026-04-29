import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  RefreshCw,
  MoreHorizontal,
  Volume2,
  CheckCircle2,
  Bot,
  ChevronDown,
  BrainCircuit
} from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ttsService } from '@/services/ttsService';
import { useProject } from '@/contexts/ProjectContext';
import { ToolConfirmation } from './ToolConfirmation';
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

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
      <div className="h-16 md:h-14 bg-background flex items-center justify-between px-5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex flex-col leading-none">
            <h3 className="text-sm font-bold tracking-tight text-white">{t('common.scriptDoctor')}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">
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
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all text-white border-none shadow-lg active:scale-95"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-6 scroll-smooth overscroll-none touch-action-pan-y"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
            <Sparkles className="w-10 h-10 mb-2" />
            <p className="text-sm font-medium">{t('common.analyzingScript')}</p>
            <p className="text-xs">{t('common.askForAdvice')}</p>
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
        <div className="relative">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('common.askTheDoctor')} 
            className="yt-input w-full pr-12 bg-surface border-white/10 !text-base appearance-none"
            style={{ fontSize: '16px' }}
          />
          <button 
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#e5e5e5] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 border-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
