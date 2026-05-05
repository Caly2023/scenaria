import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, User, Check, ArrowUp, ChevronDown, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectMetadata } from '../../types';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

interface ExtractedData {
  metadata?: ProjectMetadata;
  logline?: string;
  synopsis?: string;
  productionNotes?: string;
}

interface DiscoveryFlowProps {
  initialIdea: string;
  onValidate: (data: ExtractedData) => Promise<void>;
  onCancel: () => void;
}

export function DiscoveryFlow({ initialIdea, onValidate, onCancel }: DiscoveryFlowProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  const chatStartedRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleSendMessage = useCallback(async (text: string, snapshot?: Message[]) => {
    const base = snapshot ?? messagesRef.current;
    let newMessages = [...base];

    if (text.trim()) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
      };
      newMessages = [...newMessages, userMsg];
      setMessages(newMessages);
      setInputValue('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
    }

    setIsTyping(true);

    try {
      const genkitMessages = newMessages.map((m) => ({
        role: m.role,
        content: [{ text: m.content }],
      }));

      const context = `Analyze this initial story idea and start the discovery process: "${initialIdea}"`;

      const res = await fetch('/api/genkit/discoveryChat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: genkitMessages, context }),
      });

      const data = await res.json();

      if (data.error) {
        console.error('[DiscoveryChat] API error:', data.error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'model',
            content: 'Une erreur est survenue. Veuillez réessayer.',
          },
        ]);
        return;
      }

      const responseParts: any[] = data.message?.content ?? data.parts ?? [];
      let textContent = '';
      let toolCall: any = null;

      for (const part of responseParts) {
        if (part.text) textContent += part.text;
        if (part.toolRequest) toolCall = part.toolRequest;
      }

      if (!textContent && data.text) textContent = data.text;

      if (textContent.trim()) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: 'model', content: textContent },
        ]);
      }

      if (toolCall && toolCall.name === 'extractProjectData') {
        const extracted = toolCall.input ?? toolCall.args;
        if (extracted) {
          setExtractedData(extracted as ExtractedData);
        }
      }
    } catch (error) {
      console.error('[DiscoveryChat] Network error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          content: 'Une erreur est survenue. Veuillez réessayer.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [initialIdea]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    if (initialIdea && messages.length === 0 && !chatStartedRef.current) {
      const initialMsgs: Message[] = [{ id: '1', role: 'user', content: initialIdea }];
      setMessages(initialMsgs);
      chatStartedRef.current = true;
      handleSendMessage('', initialMsgs);
    }
  }, [initialIdea, messages.length, handleSendMessage]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, extractedData, isTyping]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleApprove = async () => {
    if (!extractedData || isSaving) return;
    setIsSaving(true);
    try {
      await onValidate(extractedData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#0d0d0d] flex flex-col"
    >
      {/* Header / History Toggle */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-center bg-gradient-to-b from-[#0d0d0d] to-transparent">
        <button 
          onClick={onCancel}
          className="px-4 py-2 text-white/40 hover:text-white/80 transition-colors text-sm font-medium"
        >
          Annuler
        </button>
        <button 
          onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all"
        >
          <MessageSquare className="w-4 h-4 text-white/60" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/80">
            {isHistoryCollapsed ? 'Afficher l\'historique' : 'Masquer l\'historique'}
          </span>
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isHistoryCollapsed ? "rotate-180" : "")} />
        </button>
      </div>

      {/* Chat Area */}
      <div
        ref={scrollContainerRef}
        className={cn(
          "flex-1 overflow-y-auto px-4 pt-24 pb-32 space-y-8 no-scrollbar relative z-10 transition-all duration-500",
          isHistoryCollapsed ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
        )}
      >
        <div className="max-w-3xl mx-auto w-full space-y-10">
          {messages
            .filter((m) => m.content.trim() !== '')
            .map((msg, idx) => (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg",
                    msg.role === 'user'
                      ? 'bg-white/10 border border-white/5'
                      : 'bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/40 text-[#D4AF37] border border-[#D4AF37]/20'
                  )}
                >
                  {msg.role === 'user' ? (
                    <User className="w-5 h-5 text-white/70" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>

                {msg.role === 'user' ? (
                  <UserMessageContent content={msg.content} isInitial={idx === 0} />
                ) : (
                  <div className="px-0 py-1.5 max-w-[85%] text-[17px] leading-[1.7] text-white/90 selection:bg-[#D4AF37]/30">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

          {isTyping && (
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center flex-shrink-0 border border-[#D4AF37]/10">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="px-0 py-1.5 flex items-center gap-2 h-9">
                  <span className="w-2 h-2 bg-[#D4AF37]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#D4AF37]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#D4AF37]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {extractedData && (
          <div className="my-12 mx-auto w-full max-w-2xl bg-[#1A1A1A]/80 border border-white/10 rounded-[32px] p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-700 ring-1 ring-white/5">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/20 shadow-inner">
                <Check className="w-6 h-6 stroke-[2.5px]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white tracking-tight">Projet Prêt à l'Action</h3>
                <p className="text-sm text-white/50 font-medium mt-0.5">L'intelligence artificielle a synthétisé votre vision.</p>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              {extractedData.metadata && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-px flex-1 bg-white/10"></span>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-bold">Metadata</span>
                    <span className="h-px flex-1 bg-white/10"></span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['format', 'genre', 'tone'].map(key => (
                      <div key={key} className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-center">
                        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{key}</div>
                        <div className="text-sm text-white/90 font-medium capitalize">{(extractedData.metadata as any)[key]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {extractedData.logline && (
                <div className="space-y-3">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-bold ml-1">Logline</span>
                  <p className="text-[15px] text-white/90 leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner italic font-serif">
                    "{extractedData.logline}"
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleApprove}
              disabled={isSaving}
              className={cn(
                "w-full py-4.5 bg-white hover:bg-[#f0f0f0] text-black font-bold rounded-2xl transition-all shadow-xl active:scale-[0.97] flex items-center justify-center gap-3 group",
                isSaving ? 'opacity-70 cursor-not-allowed' : ''
              )}
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-[3px] border-black/10 border-t-black rounded-full animate-spin" />
                  <span className="tracking-wide">Initialisation du Studio...</span>
                </>
              ) : (
                <>
                  <span className="tracking-wide text-[16px]">Propulser le Projet</span>
                  <ArrowUp className="w-5 h-5 rotate-90 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* History Collapsed Placeholder */}
      <AnimatePresence>
        {isHistoryCollapsed && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
                <Bot className="w-12 h-12 text-[#D4AF37] animate-pulse" />
              </div>
              <p className="text-white/40 text-sm font-medium tracking-widest uppercase">Conversation en cours...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-2 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/90 to-transparent">
        <div className="max-w-3xl mx-auto w-full">
          <div className="relative flex items-end gap-3 bg-[#1a1a1a] border border-white/10 rounded-2xl p-1.5 pl-5 transition-all focus-within:border-white/20 shadow-2xl backdrop-blur-xl">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Affinez votre idée..."
              rows={1}
              disabled={!!extractedData || isTyping}
              className="flex-1 bg-transparent border-none outline-none py-3 resize-none text-white placeholder:text-white/25 text-[16px] leading-relaxed max-h-[180px] no-scrollbar"
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isTyping || !!extractedData}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-10 disabled:grayscale mb-0.5"
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5px]" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function UserMessageContent({ content, isInitial }: { content: string; isInitial: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(content.length > 200);

  if (!isCollapsed) {
    return (
      <div className="px-4 py-3 bg-white/5 text-white rounded-2xl rounded-tr-sm max-w-[80%] text-[15px] leading-relaxed relative group">
        {content}
        {content.length > 200 && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="block mt-2 text-xs text-white/30 hover:text-white/60 transition-colors border-none bg-transparent p-0"
          >
            Voir moins
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="px-4 py-3 bg-white/5 text-white/50 italic rounded-2xl rounded-tr-sm max-w-[80%] text-[15px] leading-relaxed cursor-pointer hover:bg-white/10 transition-colors"
      onClick={() => setIsCollapsed(false)}
    >
      <div className="line-clamp-2">{content}</div>
      <div className="flex items-center gap-1 mt-1 text-[11px] text-[#D4AF37]/70 font-medium">
        <span>Voir plus</span>
        <ChevronDown className="w-3 h-3" />
      </div>
    </div>
  );
}
