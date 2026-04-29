import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ScriptDoctorTypingIndicatorProps {
  isHeavyThinking: boolean;
  aiStatus: string | null;
  activeTool: string | null;
  telemetryStatus: any;
}

export function ScriptDoctorTypingIndicator({
  isHeavyThinking,
  aiStatus,
  activeTool,
  telemetryStatus
}: ScriptDoctorTypingIndicatorProps) {
  const { t } = useTranslation();

  return (
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
  );
}
