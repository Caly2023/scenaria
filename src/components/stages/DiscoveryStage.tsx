import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Bot, User, Sparkles, Check } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { ProjectMetadata } from '../../types';

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

export function DiscoveryStage({ onValidate }: { onValidate: () => void }) {
  const { t } = useTranslation();
  const project = useProject();
  const { 
    currentProject, 
    stageContents, 
    handleSubcollectionUpdate, 
    handleContentUpdate, 
    handleMetadataUpdate 
  } = project;

  // The initial idea is stored in the discovery primitive
  const discoveryPrims = stageContents['Discovery'] || [];
  const initialIdea = (currentProject as any)?._tempInitialIdea || discoveryPrims[0]?.content || '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isStoryExpanded, setIsStoryExpanded] = useState(false);
  const [backgroundStep, setBackgroundStep] = useState(0);

  const backgroundSteps = [
    "Initialisation du projet...",
    "Sauvegarde de l'histoire initiale...",
    "Analyse de votre concept...",
    "Préparation du chat de découverte..."
  ];

  const chatStartedRef = useRef(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Sync messages with initial idea when it arrives
  useEffect(() => {
    if (initialIdea && messages.length === 0 && !chatStartedRef.current) {
      setMessages([{ id: '1', role: 'user', content: initialIdea }]);
    }
  }, [initialIdea, messages.length]);

  // Initial bot message kick-off if only user message exists
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'user' && !chatStartedRef.current) {
      chatStartedRef.current = true;
      handleSendMessage('', messages);
    }
  }, [messages]);

  // Cycle through background steps when typing for the first time
  useEffect(() => {
    if (isTyping && messages.length === 1) {
      const interval = setInterval(() => {
        setBackgroundStep(prev => (prev < backgroundSteps.length - 1 ? prev + 1 : prev));
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isTyping, messages.length]);

  const handleSendMessage = async (text: string, currentMessages: Message[] = messages) => {
    let newMessages = [...currentMessages];
    
    if (text.trim()) {
      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
      newMessages = [...newMessages, userMsg];
      setMessages(newMessages);
      setInputValue('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
    }

    setIsTyping(true);

    try {
      // Map to genkit format
      const genkitMessages = newMessages.map(m => ({
        role: m.role,
        content: [{ text: m.content }]
      }));

      const context = `Initial idea: ${initialIdea}`;

      const res = await fetch('/api/genkit/discoveryChat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: genkitMessages,
          context
        })
      });

      const data = await res.json();
      
      if (data.message && data.message.content) {
        let textContent = '';
        let toolCall = null;

        for (const part of data.message.content) {
          if (part.text) {
            textContent += part.text;
          }
          if (part.toolRequest) {
            toolCall = part.toolRequest;
          }
        }

        if (textContent.trim()) {
          setMessages(prev => [
            ...prev,
            { id: Date.now().toString(), role: 'model', content: textContent }
          ]);
        }

        if (toolCall && toolCall.name === 'extractProjectData') {
          setExtractedData(toolCall.input as ExtractedData);
        }
      }
    } catch (error) {
      console.error('Error in discovery chat:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, extractedData, isTyping]);

  const handleApprove = async () => {
    if (!extractedData) return;

    if (extractedData.metadata) {
      await handleMetadataUpdate(extractedData.metadata);
    }

    // Persist all components to the Project Brief stage
    if (extractedData.logline) {
      await project.handlePrimitiveAdd('Project Brief', {
        title: 'Logline',
        content: extractedData.logline,
        primitiveType: 'logline',
        order: 1
      });
    }

    if (extractedData.synopsis) {
      await project.handlePrimitiveAdd('Project Brief', {
        title: 'Synopsis',
        content: extractedData.synopsis,
        primitiveType: 'synopsis',
        order: 2
      });
    }
    
    if (extractedData.productionNotes) {
      await project.handlePrimitiveAdd('Project Brief', {
        title: 'Production Notes',
        content: extractedData.productionNotes,
        primitiveType: 'production_notes',
        order: 3
      });
    }

    onValidate();
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-background/50 rounded-2xl border border-white/5 overflow-hidden">
      
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-surface/30 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="font-medium text-white tracking-tight">Project Discovery</h2>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {messages.filter(m => m.content.trim() !== '').map((msg, idx) => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-white/10' : 'bg-blue-500/20 text-blue-400'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white/70" /> : <Bot className="w-4 h-4" />}
            </div>
            <div 
              className={`px-4 py-3 rounded-2xl max-w-[80%] text-[15px] leading-relaxed transition-all duration-300 ${
                msg.role === 'user' 
                  ? 'bg-white/10 text-white rounded-tr-sm' 
                  : 'bg-surface/50 text-white/90 border border-white/5 rounded-tl-sm'
              }`}
            >
              {idx === 0 && msg.role === 'user' && !isStoryExpanded ? (
                <div className="flex flex-col gap-2">
                  <div className="line-clamp-2 opacity-60 italic">
                    {msg.content}
                  </div>
                  <button 
                    onClick={() => setIsStoryExpanded(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium self-start flex items-center gap-1 border-none bg-transparent p-0"
                  >
                    Voir l'histoire complète
                  </button>
                </div>
              ) : (
                <>
                  {msg.content}
                  {idx === 0 && msg.role === 'user' && isStoryExpanded && (
                    <button 
                      onClick={() => setIsStoryExpanded(false)}
                      className="block mt-2 text-xs text-white/40 hover:text-white/60 font-medium border-none bg-transparent p-0"
                    >
                      Réduire
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="px-4 py-3 bg-surface/50 border border-white/5 rounded-2xl rounded-tl-sm flex items-center gap-1.5 h-12">
                <span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              {messages.length === 1 && (
                <span className="text-[11px] text-white/30 font-medium animate-pulse ml-1">
                  {backgroundSteps[backgroundStep]}
                </span>
              )}
            </div>
          </div>
        )}

        {extractedData && (
          <div className="my-8 mx-auto w-full max-w-2xl bg-surface/50 border border-green-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white tracking-tight">Discovery Complete</h3>
                <p className="text-sm text-white/50">Please review the extracted project foundation.</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {extractedData.metadata && (
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Metadata</span>
                  <div className="grid grid-cols-2 gap-2 text-sm text-white/80">
                    <div>Format: {extractedData.metadata.format}</div>
                    <div>Genre: {extractedData.metadata.genre}</div>
                    <div>Tone: {extractedData.metadata.tone}</div>
                  </div>
                </div>
              )}
              {extractedData.logline && (
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Logline</span>
                  <p className="text-sm text-white/90 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                    {extractedData.logline}
                  </p>
                </div>
              )}
              {extractedData.synopsis && (
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Synopsis</span>
                  <p className="text-sm text-white/90 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 line-clamp-3">
                    {extractedData.synopsis}
                  </p>
                </div>
              )}
            </div>

            <button 
              onClick={handleApprove}
              className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-black font-medium rounded-xl transition-colors shadow-lg shadow-green-500/20 active:scale-[0.98]"
            >
              Approve & Continue
            </button>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-white/5">
        <div className="relative flex items-end gap-2 bg-surface/50 border border-white/10 rounded-2xl p-1.5 pl-4 transition-all focus-within:border-white/20 focus-within:bg-surface/80">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your reply..."
            rows={1}
            disabled={!!extractedData || isTyping}
            className="flex-1 bg-transparent border-none outline-none py-2.5 resize-none text-white placeholder:text-white/30 text-base max-h-[150px] overflow-y-auto"
          />
          <button 
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping || !!extractedData}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center hover:bg-[#e5e5e5] transition-all active:scale-95 disabled:opacity-30 border-none shadow-md mb-0.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
