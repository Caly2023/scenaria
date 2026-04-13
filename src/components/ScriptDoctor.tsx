import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  RefreshCw,
  MoreHorizontal,
  Volume2,
  CheckCircle2,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ttsService } from '@/services/ttsService';
import { aiQuotaState } from '@/services/serviceState';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  suggested_actions?: string[];
  active_tool?: string;
  timestamp: number;
}

interface ScriptDoctorProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  messages: Message[];
  isTyping?: boolean;
  isHeavyThinking?: boolean;
  aiStatus: string | null;
  activeStage: string;
  activeTool?: string | null;
  projectLanguages?: string[];
  telemetryStatus?: {
    phase: string;
    emoji: string;
    detail: string;
    timestamp: number;
    primitiveId?: string;
  } | null;
}

// ── Mobile Full-Screen Drawer wrapper ───────────────────────────────────────
function MobileFullScreenDrawer({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (hidden but keeps consistent structure or provides slight dimming behind full-screen if needed) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          {/* Full Screen Drawer */}
          <motion.div
            key="drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[70] flex flex-col bg-background overflow-hidden"
            style={{ 
              height: '100dvh',
              paddingTop: 'env(safe-area-inset-top)'
            }}
          >
            {/* Grab Handle for Mobile */}
            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 md:hidden bg-background">
              <div className="w-12 h-1.5 bg-white/10 rounded-full" />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Script Doctor inner content ───────────────────────────────────────────────
function ScriptDoctorContent({
  onClose,
  onSendMessage,
  messages,
  isTyping = false,
  isHeavyThinking = false,
  aiStatus,
  activeStage,
  activeTool,
  projectLanguages = ['English'],
  telemetryStatus
}: ScriptDoctorProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(aiQuotaState.get());

  useEffect(() => {
    return aiQuotaState.subscribe((val) => setIsQuotaExhausted(val));
  }, []);

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
    if (messages.length > lastMessageCount.current) {
      const lastMsg = messages[messages.length - 1];
      setTimeout(() => {
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
  }, [messages.length]);

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

        {isQuotaExhausted && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20"
          >
            <Bot className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">
              {t('common.degradedMode', { defaultValue: 'Gemini 3 Quota Exhausted — Gemini 2.5 Active' })}
            </span>
          </motion.div>
        )}

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
        className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-6 scroll-smooth overscroll-contain touch-action-pan-y"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
            <Sparkles className="w-10 h-10 mb-2" />
            <p className="text-sm font-medium">{t('common.analyzingScript')}</p>
            <p className="text-xs">{t('common.askForAdvice')}</p>
          </div>
        )}

        {messages.map((msg) => {
          const displayContent = msg.content;
          const isApplied = appliedSuggestions.has(msg.id);
          const isApplyingThis = isApplying === msg.id;

          return (
            <div 
              key={msg.id}
              id={`msg-${msg.id}`}
              className={cn(
                "flex flex-col gap-2 max-w-[90%]",
                msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-xl text-sm leading-relaxed font-sans relative group",
                msg.role === 'user' 
                  ? "bg-white text-black font-medium" 
                  : "bg-surface text-white/80 border border-white/5 shadow-sm"
              )}>
                <div className="prose prose-invert prose-sm">
                  <ReactMarkdown>{displayContent}</ReactMarkdown>
                </div>

                {msg.role === 'assistant' && (
                  <div className="mt-4 flex flex-col gap-3">
                    {/* Action Chips */}
                    <div className="flex flex-wrap gap-2">
                      {msg.suggested_actions?.map((action, idx) => {
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
                                const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                                if (lastUserMsg) {
                                  onSendMessage(lastUserMsg.content);
                                }
                              } else {
                                onSendMessage(action);
                              }
                            }}
                            disabled={isApplyingThis}
                            className={cn(
                              "px-4 py-2 rounded-full text-[10px] font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 border-none",
                              isApply 
                                ? "bg-white text-black" 
                                : "border border-white/20 text-white/60 hover:bg-white/5"
                            )}
                          >
                            {isApply && isApplyingThis ? (
                              <RefreshCw className="w-3 h-3 animate-spin mr-2 inline" />
                            ) : isApply ? (
                              <Sparkles className="w-3 h-3 mr-2 inline" />
                            ) : null}
                            {action}
                          </button>
                        );
                      })}

                      {isApplied && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold border border-green-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Applied
                        </div>
                      )}
                    </div>

                    {/* TTS Button */}
                    <button 
                      onClick={() => handleTts(displayContent, msg.id)}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all border-none",
                        isSpeaking === msg.id ? "bg-white text-black animate-pulse" : "bg-white/5 text-white/40 hover:text-white"
                      )}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[9px] uppercase tracking-widest text-white/20 font-bold">
                {msg.role === 'user' ? t('common.you') : t('common.doctor')} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex flex-col gap-3 mr-auto items-start max-w-[90%]">
            <div className="bg-surface p-4 rounded-xl flex flex-col gap-3 min-w-[200px] border border-white/5 shadow-sm">
              {/* Live Status Indicator */}
              <div className="flex items-center gap-3 text-white/60">
                <div className="flex gap-1">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-1.5 h-1.5 rounded-full bg-white"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-white"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                    className="w-1.5 h-1.5 rounded-full bg-white"
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {aiStatus || (isHeavyThinking ? "Deep thinking..." : t('common.thinking'))}
                </span>
              </div>
              
              {/* Telemetry-Driven Technical Status */}
              {(activeTool || telemetryStatus) && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-2 text-white/30">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span className="text-[9px] font-medium italic">
                      {telemetryStatus
                        ? `${telemetryStatus.emoji} ${telemetryStatus.detail}`
                        : (
                          <>
                            {activeTool === 'research_context' && "🔍 Scanning narrative threads for coherence..."}
                            {activeTool === 'get_stage_structure' && "🧠 Mapping Primitive IDs..."}
                            {activeTool === 'fetch_character_details' && "👤 Analyzing character psychological profiles..."}
                            {activeTool === 'search_project_content' && "🔎 Searching across all production stages..."}
                            {activeTool === 'propose_patch' && "📡 Sending update to Firebase..."}
                            {activeTool === 'execute_multi_stage_fix' && "🔗 Coordinating multi-stage structural fix..."}
                            {activeTool === 'sync_metadata' && "🧬 Synchronizing project DNA..."}
                            {activeTool === 'add_primitive' && "➕ Inserting new structural element..."}
                            {activeTool === 'delete_primitive' && "🗑️ Removing element from production..."}
                            {activeTool === 'fetch_project_state' && "🧠 Loading full project state + ID-Map..."}
                          </>
                        )
                      }
                    </span>
                  </div>
                  
                  {telemetryStatus?.primitiveId && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[8px] font-mono text-white/15 tracking-wider pl-4"
                    >
                      ID: {telemetryStatus.primitiveId.substring(0, 12)}...
                    </motion.div>
                  )}
                  
                  {/* Progress Bar */}
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={cn(
                        "h-full",
                        telemetryStatus?.phase === 'Confirmed' ? 'bg-green-500/40' :
                        telemetryStatus?.phase === 'Error' ? 'bg-red-500/40' :
                        telemetryStatus?.phase === 'Recovery' ? 'bg-amber-500/40' :
                        'bg-white/20'
                      )}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
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

// ── Main export: renders as desktop panel OR mobile bottom sheet ──────────────
export function ScriptDoctor(props: ScriptDoctorProps) {
  // Detect mobile via window width — SSR-safe with a hook
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (isMobile) {
    return (
      <MobileFullScreenDrawer isOpen={props.isOpen} onClose={props.onClose}>
        <ScriptDoctorContent {...props} />
      </MobileFullScreenDrawer>
    );
  }

  // Desktop: render as-is (controlled externally by App.tsx sidebar panel)
  return <ScriptDoctorContent {...props} />;
}
