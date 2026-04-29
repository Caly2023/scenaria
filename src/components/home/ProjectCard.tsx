import { motion } from 'motion/react';
import { 
  Clock, 
  Film,
  Clapperboard,
  ChevronRight,
  Trash2,
  Globe,
  Tag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { triggerHaptic } from '@/lib/haptics';
import { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
  idx: number;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, idx, onSelect, onDelete }: ProjectCardProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ 
        delay: idx * 0.05,
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1]
      }}
      className="group relative"
    >
      {/* Background Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-white/0 via-white/[0.05] to-white/0 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur" />
      
      <button
        onClick={() => {
          triggerHaptic('medium');
          onSelect(project.id);
        }}
        className="relative w-full p-6 md:p-8 text-left flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 glass rounded-[32px] border-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden"
      >
        {/* Decorative Background Element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        {/* Left: Premium Icon Container */}
        <div className="flex-shrink-0 relative">
          <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="w-14 h-14 md:w-24 md:h-24 rounded-[20px] md:rounded-[28px] bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 flex items-center justify-center group-hover:from-white group-hover:to-white transition-all duration-700 shadow-2xl relative z-10">
            <Clapperboard className="w-6 h-6 md:w-10 md:h-10 group-hover:text-black transition-colors duration-500" />
          </div>
        </div>

        {/* Center: Main Information */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="min-w-0 mb-4">
            <h3 className="text-xl md:text-2xl font-sans font-bold tracking-tight text-white truncate group-hover:text-white transition-colors duration-300">
              {project.metadata?.title || t('common.untitled')}
            </h3>
            
            {/* Last Update Detail */}
            <div className="flex items-center gap-2 mt-2 opacity-70 group-hover:opacity-90 transition-opacity duration-500 font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs uppercase tracking-widest">
                {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'NEW'}
              </span>
            </div>

            {project.metadata?.logline && (
              <p className="text-sm md:text-base text-white/70 line-clamp-2 italic font-light mt-3 group-hover:text-white/90 transition-colors duration-300 max-w-2xl leading-relaxed">
                {project.metadata.logline}
              </p>
            )}
          </div>

          {/* Metadata Tags Row */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-white/[0.05] border border-white/5 text-xs font-bold uppercase tracking-[0.2em] text-white/70 group-hover:bg-white/10 group-hover:text-white transition-all duration-300 whitespace-nowrap">
              <Film className="w-4 h-4 opacity-50" />
              <span>{project.metadata?.format || 'Auto'}</span>
            </div>
            
            {project.metadata?.genre && (
              <>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <div className="flex items-center gap-3 px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-white/[0.05] border border-white/5 text-xs font-bold uppercase tracking-[0.2em] text-white/70 group-hover:bg-white/10 group-hover:text-white transition-all duration-300 whitespace-nowrap">
                  <Tag className="w-4 h-4 opacity-50" />
                  <span>{project.metadata.genre}</span>
                </div>
              </>
            )}

            {project.metadata?.languages?.[0] && (
              <>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <div className="flex items-center gap-3 px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-white/[0.05] border border-white/5 text-xs font-bold uppercase tracking-[0.2em] text-white/80 group-hover:bg-white/10 group-hover:text-white transition-all duration-300 whitespace-nowrap">
                  <Globe className="w-4 h-4 opacity-50" />
                  <span>{project.metadata.languages[0]}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Interaction Indicator */}
        <div className="flex-shrink-0 ml-auto md:ml-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border border-white/5 group-hover:border-white/20 group-hover:bg-white/5 transition-all duration-500">
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white/10 group-hover:text-white/60 group-hover:translate-x-1 transition-all duration-500" />
          </div>
        </div>
      </button>

      {/* Quick Actions Overlay (Delete) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          triggerHaptic('warning');
          onDelete(project.id);
        }}
        className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 rounded-full flex items-center justify-center bg-transparent hover:bg-red-500/10 text-white/0 hover:text-red-500 transition-all duration-300 opacity-100 md:opacity-0 group-hover:opacity-100 z-20"
        title={t('common.delete')}
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </motion.div>
  );
}
