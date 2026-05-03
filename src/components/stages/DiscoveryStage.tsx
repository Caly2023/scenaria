import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, User, Check, ArrowUp, ChevronDown, ChevronUp } from 'lucide-react';
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
    const hasUserStory = messages.length === 1 && messages[0].role === 'user' && messages[0].content.trim() !== '';
    if (hasUserStory && !chatStartedRef.current) {
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

      const context = `Analyze this initial story idea and start the discovery process: "${initialIdea}"`;

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
    <div className="flex flex-col h-full w-full">
      
      {/* Chat Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-2 py-4 space-y-8 no-scrollbar"
      >
        <div className="max-w-3xl mx-auto w-full space-y-8">
          {messages.filter(m => m.content.trim() !== '').map((msg, idx) => (
            <div 
              key={msg.id} 
              className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-white/10' : 'bg-blue-500/20 text-blue-400'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white/70" /> : <Bot className="w-4 h-4" />}
              </div>
              
              {msg.role === 'user' ? (
                <UserMessageContent content={msg.content} isInitial={idx === 0} />
              ) : (
                <div className="px-0 py-1 max-w-[85%] text-[16px] leading-[1.6] text-white/90">
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="px-0 py-1 flex items-center gap-1.5 h-8">
                  <span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                {messages.length === 1 && (
                  <span className="text-[11px] text-white/30 font-medium animate-pulse">
                    {backgroundSteps[backgroundStep]}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>


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

      {/* Input Area - Gemini Style */}
      <div className="max-w-3xl mx-auto w-full pb-8 px-4">
        <div className="relative flex items-center gap-2 bg-[#1E1F20] border border-white/5 rounded-full px-5 py-2 transition-all focus-within:ring-1 focus-within:ring-white/10">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Répondre..."
            rows={1}
            disabled={!!extractedData || isTyping}
            className="flex-1 bg-transparent border-none outline-none py-2 resize-none text-white placeholder:text-white/40 text-[15px] max-h-[200px] no-scrollbar"
          />
          <button 
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping || !!extractedData}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#e5e5e5] transition-all active:scale-90 disabled:opacity-20 border-none ml-1"
          >
            <ArrowUp className="w-5 h-5 stroke-[2.5px]" />
          </button>
        </div>
        <p className="text-[10px] text-center text-white/20 mt-3 font-medium tracking-wide uppercase">
          ScénarIA peut faire des erreurs. Vérifiez les informations importantes.
        </p>
      </div>
    </div>
  );
}

function UserMessageContent({ content, isInitial }: { content: string, isInitial: boolean }) {
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
    <div className="px-4 py-3 bg-white/5 text-white/50 italic rounded-2xl rounded-tr-sm max-w-[80%] text-[15px] leading-relaxed cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setIsCollapsed(false)}>
      <div className="line-clamp-2">
        {content}
      </div>
      <div className="flex items-center gap-1 mt-1 text-[11px] text-blue-400/70 font-medium">
        <span>Voir plus</span>
        <ChevronDown className="w-3 h-3" />
      </div>
    </div>
  );
}

