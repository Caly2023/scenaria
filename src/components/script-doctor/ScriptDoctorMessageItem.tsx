import React from 'react';
import { 
  Sparkles, 
  RefreshCw,
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
import { ToolConfirmation } from './ToolConfirmation';
import { ScriptDoctorMessage } from '@/types/scriptDoctor';

interface ScriptDoctorMessageItemProps {
  msg: ScriptDoctorMessage;
  isApplied: boolean;
  isApplyingThis: boolean;
  isPendingForThis: boolean;
  pendingToolCall: any;
  isSpeaking: string | null;
  onConfirmTool: () => void;
  onCancelTool: () => void;
  handleApply: (msgId: string, action: string) => void;
  handleTts: (text: string, msgId: string) => void;
  onSendMessage: (text: string) => void;
  messages: ScriptDoctorMessage[];
}

export function ScriptDoctorMessageItem({
  msg,
  isApplied,
  isApplyingThis,
  isPendingForThis,
  pendingToolCall,
  isSpeaking,
  onConfirmTool,
  onCancelTool,
  handleApply,
  handleTts,
  onSendMessage,
  messages
}: ScriptDoctorMessageItemProps) {
  const { t } = useTranslation();
  const displayContent = msg.content;

  return (
    <div 
      id={`msg-${msg.id}`}
      className={cn(
        "flex flex-col gap-2 w-full",
        msg.role === 'user' ? "ml-auto items-end max-w-[85%]" : "mr-auto items-start w-full"
      )}
    >
      <div className={cn(
        "text-sm leading-relaxed font-sans relative group w-full transition-all duration-300",
        msg.role === 'user' 
          ? "p-4 rounded-2xl bg-gradient-to-br from-white to-[#f0f0f0] text-black font-medium shadow-[0_4px_12px_rgba(255,255,255,0.1)]" 
          : "text-white/90"
      )}>
        {msg.role === 'assistant' && (msg.reasoning || msg.thinking) && (
          <details className="mb-5 group/thinking bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <summary className="flex items-center gap-2 p-3 text-[10px] font-bold uppercase tracking-widest text-white/50 cursor-pointer hover:bg-white/5 transition-all list-none select-none">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <BrainCircuit className="w-3.5 h-3.5" />
              </div>
              <span>{t('common.reasoning', { defaultValue: 'Cognitive Process' })}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-auto transition-transform group-open/thinking:rotate-180" />
            </summary>
            <div className="p-4 pt-0 text-xs text-white/40 italic leading-relaxed font-mono border-t border-white/5 bg-black/20">
              <ReactMarkdown>
                {msg.reasoning || msg.thinking || ""}
              </ReactMarkdown>
            </div>
          </details>
        )}

        <div className={cn(
          "scenaria-markdown",
          msg.role === 'assistant' ? "prose-p:leading-relaxed prose-pre:bg-white/5 prose-headings:text-white prose-strong:text-white prose-em:text-white/70" : ""
        )}>
          <ReactMarkdown>
            {String(displayContent)}
          </ReactMarkdown>
        </div>

        {msg.role === 'assistant' && isPendingForThis && pendingToolCall && (
          <ToolConfirmation 
            call={pendingToolCall.call} 
            onConfirm={onConfirmTool} 
            onCancel={onCancelTool} 
          />
        )}

        {msg.role === 'assistant' && !isPendingForThis && (
          <div className="mt-8 flex flex-col gap-5">
            {/* Minimal Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {msg.suggested_actions?.map((action: string, idx: number) => {
                const isApply = action.toLowerCase().includes('apply') || 
                                action.toLowerCase().includes('fix') || 
                                action.toLowerCase().includes('refactor');
                
                if (isApply && isApplied) return null;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (isApply) {
                        handleApply(msg.id, action);
                      } else if (action === 'Retry') {
                        const lastUserMsg = [...(messages || [])].reverse().find(m => m.role === 'user');
                        if (lastUserMsg) {
                          onSendMessage(lastUserMsg.content);
                        }
                      } else {
                        onSendMessage(action);
                      }
                    }}
                    disabled={isApplyingThis}
                    className={cn(
                      "h-9 px-5 rounded-full text-[10px] font-bold transition-all border flex items-center gap-2",
                      isApply 
                        ? "bg-white text-black border-white hover:bg-[#e5e5e5] shadow-lg shadow-white/5" 
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/30"
                    )}
                  >
                    {isApply && isApplyingThis ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isApply ? (
                      <Sparkles className="w-3.5 h-3.5" />
                    ) : null}
                    {action}
                  </button>
                );
              })}

              {isApplied && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-2 h-9 px-5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold border border-green-500/20 shadow-lg shadow-green-500/5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('common.applied', { defaultValue: 'Applied' })}
                </motion.div>
              )}
            </div>

            {/* TTS Button - Floating/Minimal */}
            <div className="flex items-center justify-end">
              <button 
                onClick={() => handleTts(displayContent, msg.id)}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all border border-white/5 bg-white/5 text-white/20 hover:text-white/80 hover:bg-white/10",
                  isSpeaking === msg.id && "bg-white text-black animate-pulse opacity-100 shadow-xl border-white"
                )}
                title={t('common.speak', { defaultValue: 'Speak' })}
              >
                <Volume2 className={cn("w-4 h-4", isSpeaking === msg.id && "text-black")} />
              </button>
            </div>
          </div>
        )}
      </div>
      <span className="text-[9px] uppercase tracking-widest text-white/20 font-bold px-1 mt-1 flex items-center gap-2">
        {msg.role === 'user' ? (
          <span className="text-white/40">{t('common.you')}</span>
        ) : (
          <span className="text-white/60 flex items-center gap-1.5">
            <Bot className="w-2.5 h-2.5" />
            {t('common.doctor')}
          </span>
        )} 
        <span className="w-1 h-1 bg-white/10 rounded-full" />
        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
