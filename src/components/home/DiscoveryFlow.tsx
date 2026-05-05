import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, User, Check, ArrowUp, ChevronDown, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectMetadata } from '../../types';
import { cn } from '@/lib/utils';
import { DictationButton } from '../ui/DictationButton';

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
  const rootRef = useRef<HTMLDivElement>(null);

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
    if (rootRef.current) {
      rootRef.current.scrollTo({
        top: rootRef.current.scrollHeight,
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
      ref={rootRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#0d0d0d] overflow-y-auto overflow-x-hidden scroll-smooth selection:bg-[#D4AF37]/30"
    >
      {/* Top Navigation */}
      <div className="fixed top-0 left-0 right-0 z-[110] px-6 py-4 flex justify-between items-center pointer-events-none">
        <button 
          onClick={onCancel}
          className="px-4 py-2 text-white/40 hover:text-white/80 transition-colors text-sm font-medium pointer-events-auto"
        >
          Annuler
        </button>
        <button 
          onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all pointer-events-auto backdrop-blur-md"
        >
          <MessageSquare className="w-4 h-4 text-white/60" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
            {isHistoryCollapsed ? 'Afficher' : 'Masquer'}
          </span>
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isHistoryCollapsed ? "rotate-180" : "")} />
        </button>
      </div>

      {/* Main Chat Container */}
      <div
        className={cn(
          "w-full max-w-5xl mx-auto px-6 pt-28 pb-48 space-y-12 transition-all duration-700 ease-out",
          isHistoryCollapsed ? "opacity-0 translate-y-4 scale-95 pointer-events-none" : "opacity-100 translate-y-0 scale-100"
        )}
      >
        {messages
          .filter((m) => m.content.trim() !== '')
          .map((msg, idx) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500",
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-2xl",
                  msg.role === 'user'
                    ? 'bg-white/5 border border-white/10'
                    : 'bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/20'
                )}
              >
                {msg.role === 'user' ? (
                  <User className="w-5 h-5 text-white/60" />
                ) : (
                  <Bot className="w-5 h-5" />
                )}
              </div>

              <div className={cn(
                "flex flex-col gap-1 max-w-[85%]",
                msg.role === 'user' ? "items-end" : "items-start"
              )}>
                {msg.role === 'user' ? (
                  <UserMessageContent content={msg.content} isInitial={idx === 0} />
                ) : (
                  <div className="text-[18px] leading-[1.8] text-white/90 font-light tracking-wide whitespace-pre-wrap">
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          ))}

        {isTyping && (
          <div className="flex items-start gap-6">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center flex-shrink-0 border border-[#D4AF37]/10">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 h-10">
              <span className="w-1.5 h-1.5 bg-[#D4AF37]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-[#D4AF37]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-[#D4AF37]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {extractedData && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-16 space-y-10 border-t border-white/5 pt-16"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/20">
                <Check className="w-7 h-7 stroke-[2.5px]" />
              </div>
              <div>
                <h3 className="text-2xl font-medium text-white tracking-tight">Intelligence Synthétisée</h3>
                <p className="text-sm text-white/40 mt-1">Votre vision est maintenant structurée et prête pour la production.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {extractedData.metadata && (
                <div className="col-span-full grid grid-cols-3 gap-4">
                  {['format', 'genre', 'tone'].map(key => (
                    <div key={key} className="bg-white/5 border border-white/5 rounded-2xl px-6 py-4">
                      <div className="text-[10px] text-white/20 uppercase tracking-[0.2em] mb-2 font-bold">{key}</div>
                      <div className="text-[16px] text-white/90 font-medium capitalize">{(extractedData.metadata as any)[key]}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {extractedData.logline && (
                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold ml-1">Logline</span>
                  <p className="text-[17px] text-white/90 leading-relaxed font-serif italic border-l-2 border-[#D4AF37]/30 pl-6 py-2">
                    "{extractedData.logline}"
                  </p>
                </div>
              )}

              {extractedData.synopsis && (
                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold ml-1">Synopsis</span>
                  <div className="text-[15px] text-white/60 leading-relaxed">
                    {extractedData.synopsis}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleApprove}
              disabled={isSaving}
              className={cn(
                "w-full py-6 bg-white hover:bg-neutral-200 text-black font-bold rounded-2xl transition-all shadow-2xl flex items-center justify-center gap-4 group mt-8",
                isSaving ? 'opacity-70 cursor-not-allowed' : ''
              )}
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-[3px] border-black/10 border-t-black rounded-full animate-spin" />
                  <span className="tracking-widest uppercase text-xs">Initialisation...</span>
                </>
              ) : (
                <>
                  <span className="tracking-widest uppercase text-xs">Propulser le Projet</span>
                  <ArrowUp className="w-5 h-5 rotate-90 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-[120] px-6 pb-10 pt-10 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/80 to-transparent pointer-events-none">
        <div className="max-w-4xl mx-auto w-full pointer-events-auto">
          <div className="flex items-center gap-4 bg-[#161616]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-2 pl-6 transition-all focus-within:border-white/20 shadow-2xl">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Affinez votre idée..."
              rows={1}
              disabled={!!extractedData || isTyping}
              className="flex-1 bg-transparent border-none outline-none py-3 resize-none text-white placeholder:text-white/20 text-[17px] leading-tight max-h-[200px] no-scrollbar"
            />
            <div className="flex items-center gap-2 pr-2">
              <DictationButton 
                onResult={(text) => setInputValue(prev => prev + (prev ? ' ' : '') + text)}
                size="md"
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isTyping || !!extractedData}
                className="flex-shrink-0 w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-0 disabled:scale-90 transition-all duration-300"
              >
                <ArrowUp className="w-5 h-5 stroke-[2.5px]" />
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Collapsed Placeholder */}
      <AnimatePresence>
        {isHistoryCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-8">
              <div className="w-32 h-32 rounded-full bg-[#D4AF37]/5 flex items-center justify-center border border-[#D4AF37]/10 relative">
                <Bot className="w-14 h-14 text-[#D4AF37] animate-pulse" />
                <div className="absolute inset-0 rounded-full border border-[#D4AF37]/20 animate-ping opacity-20" />
              </div>
              <p className="text-white/20 text-[10px] font-bold tracking-[0.5em] uppercase">Intelligence en veille</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function UserMessageContent({ content, isInitial }: { content: string; isInitial: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(content.length > 300);

  if (!isCollapsed) {
    return (
      <div className="px-6 py-4 bg-white/5 text-white/90 rounded-[24px] rounded-tr-sm text-[16px] leading-relaxed relative group border border-white/5">
        {content}
        {content.length > 300 && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="block mt-4 text-[10px] uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors border-none bg-transparent p-0 font-bold"
          >
            Voir moins
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="px-6 py-4 bg-white/5 text-white/40 italic rounded-[24px] rounded-tr-sm text-[16px] leading-relaxed cursor-pointer hover:bg-white/10 transition-all border border-white/5"
      onClick={() => setIsCollapsed(false)}
    >
      <div className="line-clamp-2 font-light">{content}</div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-[#D4AF37]/50 font-bold uppercase tracking-widest">
        <span>Détails</span>
        <ChevronDown className="w-3 h-3" />
      </div>
    </div>
  );
}

