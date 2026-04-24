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
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ttsService } from '@/services/ttsService';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'model';
  content: string;
  status?: string;
  thinking?: string;
  reasoning?: string;
  suggested_actions?: string[];
  active_tool?: string;
  timestamp: number;
  content_parts?: any[];
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
  pendingToolCall?: { call: any; botMsgId: string } | null;
  onConfirmTool?: () => void;
  onCancelTool?: () => void;
}

// ── Tool Confirmation Component ─────────────────────────────────────────────
function ToolConfirmation({ call, onConfirm, onCancel }: { call: any; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const { name, args } = call;

  const getToolDescription = () => {
    switch (name) {
      case 'propose_patch':
        return `Modify ${args.stage}: ${args.updates.title || args.updates.name || 'selected item'}`;
      case 'add_primitive':
        return `Add new ${args.stage}: ${args.primitive.title || args.primitive.name}`;
      case 'delete_primitive':
        return `Delete ${args.stage} item: ${args.id}`;
      case 'restructure_stage':
        return `Full restructure of ${args.stage}`;
      case 'execute_multi_stage_fix':
        return `Apply multi-stage architectural fix`;
      case 'sync_metadata':
        return `Update project metadata`;
      default:
        return `Execute technical operation: ${name}`;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Approval Required</span>
          <span className="text-sm font-medium text-white/90">{getToolDescription()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onConfirm}
          className="flex-1 h-10 rounded-xl bg-white text-black text-xs font-bold hover:bg-[#e5e5e5] transition-all active:scale-95 border-none"
        >
          Approve & Execute
        </button>
        <button 
          onClick={onCancel}
          className="flex-1 h-10 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all active:scale-95 border-none"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ── Mobile Full-Screen Drawer wrapper ───────────────────────────────────────
// ... (rest of the file)
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
  telemetryStatus,
  pendingToolCall,
  onConfirmTool,
  onCancelTool
}: ScriptDoctorProps) {
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

        {messages.map((msg) => {
          const displayContent = msg.content;
          const isApplied = appliedSuggestions.has(msg.id);
          const isApplyingThis = isApplying === msg.id;
          const isPendingForThis = pendingToolCall?.botMsgId === msg.id;

          return (
            <div 
              key={msg.id}
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
                    onConfirm={onConfirmTool!} 
                    onCancel={onCancelTool!} 
                  />
                )}

                {msg.role === 'assistant' && !isPendingForThis && (
                  <div className="mt-8 flex flex-col gap-5">
                    {/* Minimal Action Buttons */}
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
        })}


        {isTyping && (
          <div className="flex flex-col gap-3 mr-auto items-start max-w-[90%]">
            <div className="bg-surface/50 backdrop-blur-xl p-5 rounded-2xl flex flex-col gap-4 min-w-[240px] border border-white/10 shadow-2xl relative overflow-hidden group">
              {/* Animated Background Pulse */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 animate-pulse" />
              
              {/* Live Status Indicator */}
              <div className="flex items-center gap-4 text-white relative z-10">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-20" />
                  <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-spin [animation-duration:3s]" />
                  <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80">
                    {activeTool ? "Executing Tool" : "Thinking"}
                  </span>
                  <span className="text-sm font-bold text-white/90 truncate max-w-[150px]">
                    {aiStatus || (isHeavyThinking ? "Deep structural analysis..." : t('common.thinking'))}
                  </span>
                </div>
              </div>
              
              {/* Telemetry-Driven Technical Status */}
              {(activeTool || telemetryStatus) && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3 relative z-10"
                >
                  <div className="flex items-center gap-2.5 text-white/40 bg-white/5 p-2.5 rounded-lg border border-white/5">
                    <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                      <RefreshCw className="w-3 h-3 animate-spin text-white/30" />
                    </div>
                    <span className="text-[10px] font-medium italic leading-tight">
                      {telemetryStatus
                        ? `${telemetryStatus.emoji} ${telemetryStatus.detail}`
                        : (
                          <>
                            {activeTool === 'research_context' && "Scanning narrative threads for coherence..."}
                            {activeTool === 'get_stage_structure' && "Mapping system primitives..."}
                            {activeTool === 'fetch_character_details' && "Analyzing psychological profiles..."}
                            {activeTool === 'search_project_content' && "Searching across production stages..."}
                            {activeTool === 'propose_patch' && "Syncing updates to Firebase..."}
                            {activeTool === 'execute_multi_stage_fix' && "Coordinating structural fixes..."}
                            {activeTool === 'sync_metadata' && "Synchronizing project DNA..."}
                            {activeTool === 'add_primitive' && "Inserting structural element..."}
                            {activeTool === 'delete_primitive' && "Removing element from production..."}
                            {activeTool === 'fetch_project_state' && "Loading full state-map..."}
                            {activeTool === 'update_agent_status' && "Updating cognitive state..."}
                          </>
                        )
                      }
                    </span>
                  </div>
                  
                  {telemetryStatus?.primitiveId && (
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-mono text-white/20 tracking-wider">
                        TARGET_ID: {String(telemetryStatus.primitiveId).substring(0, 8)}...
                      </span>
                    </div>
                  )}
                  
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className={cn(
                        "h-full relative",
                        telemetryStatus?.phase === 'Confirmed' ? 'bg-green-500' :
                        telemetryStatus?.phase === 'Error' ? 'bg-red-500' :
                        telemetryStatus?.phase === 'Recovery' ? 'bg-amber-500' :
                        'bg-gradient-to-r from-blue-500 to-purple-500'
                      )}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                    </motion.div>
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
  const isMobile = useIsMobile();

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
