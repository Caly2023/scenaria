import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, User, Check, ArrowUp, ChevronDown } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { ProjectMetadata } from '../../types';
import { stageRegistry } from '../../config/stageRegistry';

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

export function DiscoveryStage({ onValidate }: { onValidate: () => void | Promise<void> }) {
  const { t } = useTranslation();
  const project = useProject();
  const {
    currentProject,
    stageContents,
    handleMetadataUpdate,
    handleFieldsUpdate,
    handlePrimitiveAdd,
    handleStageChange,
  } = project;

  // The initial idea is stored in the discovery primitive
  const discoveryPrims = stageContents['Discovery'] || [];
  const initialIdea =
    (currentProject as any)?._tempInitialIdea ||
    discoveryPrims[0]?.content ||
    '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [backgroundStep, setBackgroundStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const backgroundSteps = [
    'Initialisation du projet...',
    "Sauvegarde de l'histoire initiale...",
    'Analyse de votre concept...',
    'Préparation du chat de découverte...',
  ];

  // Refs — avoid stale closures without over-triggering effects
  const chatStartedRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const initialIdeaRef = useRef(initialIdea);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    initialIdeaRef.current = initialIdea;
  }, [initialIdea]);

  // ── Core send function (stable — defined before effects that call it) ──────
  const handleSendMessage = useCallback(async (text: string, snapshot?: Message[]) => {
    // Use the explicit snapshot (for first call) or the live ref (for user inputs)
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

      const context = `Analyze this initial story idea and start the discovery process: "${initialIdeaRef.current}"`;

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

      // The discoveryChat flow returns { parts, text, message }
      // parts/message.content may contain text and/or toolRequest entries
      const responseParts: any[] =
        data.message?.content ?? data.parts ?? [];

      let textContent = '';
      let toolCall: any = null;

      for (const part of responseParts) {
        if (part.text) textContent += part.text;
        if (part.toolRequest) toolCall = part.toolRequest;
      }

      // Fallback: top-level text field
      if (!textContent && data.text) textContent = data.text;

      if (textContent.trim()) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: 'model', content: textContent },
        ]);
      }

      // Tool call — the AI decided it has gathered enough information
      if (toolCall && toolCall.name === 'extractProjectData') {
        console.log('[DiscoveryChat] Tool call detected:', toolCall.name);
        // Genkit may put args in .input or .args depending on version
        const extracted = toolCall.input ?? toolCall.args;
        if (extracted) {
          console.log('[DiscoveryChat] Extracted data:', extracted);
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
  }, []); // stable — reads everything via refs

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // ── Populate first user message from the initial idea ────────────────────
  useEffect(() => {
    if (initialIdea && messagesRef.current.length === 0 && !chatStartedRef.current) {
      setMessages([{ id: '1', role: 'user', content: initialIdea }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIdea]);

  // ── Kick off the first AI response once the seed message is present ───────
  // Depends on messages.length (not `messages`) to avoid infinite loops.
  useEffect(() => {
    const msgs = messagesRef.current;
    if (
      msgs.length === 1 &&
      msgs[0].role === 'user' &&
      msgs[0].content.trim() !== '' &&
      !chatStartedRef.current
    ) {
      chatStartedRef.current = true;
      handleSendMessage('', msgs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // ── Background step animation during first AI response ───────────────────
  useEffect(() => {
    if (!isTyping || messagesRef.current.length !== 1) return;
    const interval = setInterval(() => {
      setBackgroundStep((prev) =>
        prev < backgroundSteps.length - 1 ? prev + 1 : prev,
      );
    }, 1500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTyping]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, extractedData, isTyping]);

  // ── Keyboard handler ──────────────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // ── Approve & advance to next stage ──────────────────────────────────────
  const handleApprove = async () => {
    if (!currentProject || !extractedData || isSaving) return;
    setIsSaving(true);

    try {
      console.log('[DiscoveryStage] Starting atomic data persistence...', extractedData);
      
      // 1. First, add all subcollection primitives in parallel
      // These are separate documents so they don't conflict with the root project doc
      const primitivePromises: Promise<any>[] = [];

      if (extractedData.logline) {
        primitivePromises.push(
          handlePrimitiveAdd('Project Brief', {
            title: 'Logline',
            content: extractedData.logline,
            primitiveType: 'logline',
            order: 1,
          })
        );
      }

      if (extractedData.synopsis) {
        primitivePromises.push(
          handlePrimitiveAdd('Project Brief', {
            title: 'Synopsis',
            content: extractedData.synopsis,
            primitiveType: 'synopsis',
            order: 2,
          })
        );
      }

      if (extractedData.productionNotes) {
        primitivePromises.push(
          handlePrimitiveAdd('Project Brief', {
            title: 'Production Notes',
            content: extractedData.productionNotes,
            primitiveType: 'production_notes',
            order: 3,
          })
        );
      }

      // Await all subcollection additions first
      if (primitivePromises.length > 0) {
        await Promise.all(primitivePromises);
        console.log('[DiscoveryStage] Subcollection primitives added.');
      }

      // Prepare the ATOMIC update for the project document
      // This includes metadata AND stage validation to avoid race conditions
      const allStageIds = stageRegistry.getAllIds();
      const nextStage = allStageIds[allStageIds.indexOf('Discovery') + 1] || 'Project Brief';
      const newValidatedStages = Array.from(new Set([...(currentProject.validatedStages || []), 'Discovery']));

      // Sanitize metadata: remove undefined/null to prevent Firestore errors
      const sanitizedMetadata = { 
        ...currentProject.metadata,
        languages: currentProject.metadata?.languages || []
      };
      
      if (extractedData.metadata) {
        Object.entries(extractedData.metadata).forEach(([key, value]) => {
          // Ignore undefined, null, or empty string values so we don't overwrite valid defaults
          if (value !== undefined && value !== null && value !== '') {
            (sanitizedMetadata as any)[key] = value;
          }
        });
      }
      
      // Safety net: ensure title is never empty so the project isn't filtered out of the dashboard
      if (!sanitizedMetadata.title || sanitizedMetadata.title.trim() === '') {
        sanitizedMetadata.title = 'Untitled Project';
      }

      const updates: Record<string, any> = {
        metadata: sanitizedMetadata,
        validatedStages: newValidatedStages,
        activeStage: nextStage,
        // Mark Discovery as ready so it doesn't show as "needs improvement"
        [`stageAnalyses.Discovery`]: {
          evaluation: 'Discovery completed successfully through conversation.',
          isReady: true,
          updatedAt: Date.now(),
          score: 100
        }
      };

      console.log('[DiscoveryStage] Sending atomic project update:', updates);
      
      // 3. Perform the single atomic update to the root document
      // This will trigger the transition in the UI since activeStage is changing
      await handleFieldsUpdate(updates);
      
      // 4. Force stage change in local state
      handleStageChange(nextStage as any);
      
      console.log('[DiscoveryStage] Atomic transition complete.');
    } catch (error) {
      console.error('[DiscoveryStage] Fatal error during approval:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full w-full bg-[#0d0d0d] relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Chat Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 pt-8 pb-32 space-y-8 no-scrollbar relative z-10"
      >
        <div className="max-w-3xl mx-auto w-full space-y-10">
          {messages
            .filter((m) => m.content.trim() !== '')
            .map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                    msg.role === 'user'
                      ? 'bg-white/10 border border-white/5'
                      : 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-400 border border-blue-500/20'
                  }`}
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
                  <div className="px-0 py-1.5 max-w-[85%] text-[17px] leading-[1.7] text-white/90 selection:bg-blue-500/30">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

          {isTyping && (
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/10">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="px-0 py-1.5 flex items-center gap-2 h-9">
                  <span
                    className="w-2 h-2 bg-blue-400/40 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-blue-400/40 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-blue-400/40 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
                {messages.length === 1 && (
                  <span className="text-[12px] text-white/40 font-medium tracking-wide animate-pulse">
                    {backgroundSteps[backgroundStep]}
                  </span>
                )}
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
                <h3 className="text-xl font-semibold text-white tracking-tight">
                  Projet Prêt à l'Action
                </h3>
                <p className="text-sm text-white/50 font-medium mt-0.5">
                  L'intelligence artificielle a synthétisé votre vision.
                </p>
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

              {extractedData.synopsis && (
                <div className="space-y-3">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-bold ml-1">Synopsis</span>
                  <div className="text-[14px] text-white/80 leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
                    <p className="line-clamp-4">{extractedData.synopsis}</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleApprove}
              disabled={isSaving}
              className={`w-full py-4.5 bg-white hover:bg-[#f0f0f0] text-black font-bold rounded-2xl transition-all shadow-xl active:scale-[0.97] flex items-center justify-center gap-3 group ${
                isSaving ? 'opacity-70 cursor-not-allowed' : ''
              }`}
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

      {/* Input Area – Premium Compact Style */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-2 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/90 to-transparent">
        <div className="max-w-3xl mx-auto w-full">
          <div className="relative flex items-end gap-3 bg-[#1a1a1a] border border-white/10 rounded-2xl p-1.5 pl-5 transition-all focus-within:border-white/20 shadow-2xl backdrop-blur-xl">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Décrivez votre vision..."
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
    </div>
  );

}

function UserMessageContent({
  content,
  isInitial,
}: {
  content: string;
  isInitial: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(content.length > 200);

  if (!isCollapsed) {
    return (
      <div className="px-4 py-3 bg-white/5 text-white rounded-2xl rounded-tr-sm max-w-[80%] text-[15px] leading-relaxed">
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
      <div className="flex items-center gap-1 mt-1 text-[11px] text-blue-400/70 font-medium">
        <span>Voir plus</span>
        <ChevronDown className="w-3 h-3" />
      </div>
    </div>
  );
}
