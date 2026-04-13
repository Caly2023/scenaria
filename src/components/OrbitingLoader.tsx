import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface OrbitingLoaderProps {
  size?: 'small' | 'large';
  title?: string;
  description?: string;
  showText?: boolean;
}

export const OrbitingLoader: React.FC<OrbitingLoaderProps> = ({
  size = 'large',
  title,
  description,
  showText = true,
}) => {
  const isLarge = size === 'large';
  
  // Responsive dimensions
  const orbitWidth = isLarge ? 240 : 160;
  const containerSize = isLarge ? 'w-24 h-24' : 'w-16 h-16';
  const borderRadius = isLarge ? 'rounded-[32px]' : 'rounded-[24px]';
  const fontSize = isLarge ? 'text-3xl' : 'text-xl';
  const taglineSize = isLarge ? 'text-[10px]' : 'text-[8px]';

  return (
    <div className="flex flex-col items-center justify-center space-y-12">
      <div className="relative flex items-center justify-center">
        {/* Comet Orbit Animation */}
        <div 
          className="absolute z-10 pointer-events-none"
          style={{ 
            width: orbitWidth, 
            height: orbitWidth,
            animation: 'orbit 2s linear infinite'
          }}
        >
          {/* Tapered Tail (using conic gradient for smooth fade and segment) */}
          <div 
            className="absolute inset-0 rounded-full" 
            style={{
              background: 'conic-gradient(from 0deg, #D4AF37 0%, transparent 40%)',
              maskImage: 'radial-gradient(circle, transparent 48%, black 48.5%, black 50%, transparent 50.5%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 48%, black 48.5%, black 50%, transparent 50.5%)',
              opacity: 0.8
            }}
          />
          
          {/* Glowing Comet Head */}
          <div 
            className="absolute top-[0px] left-1/2 -translate-x-1/2"
            style={{ 
              width: isLarge ? '8px' : '6px', 
              height: isLarge ? '8px' : '6px',
              backgroundColor: '#D4AF37',
              borderRadius: '50%',
              boxShadow: '0 0 15px 4px rgba(212, 175, 55, 0.6), 0 0 30px 8px rgba(212, 175, 55, 0.2)',
              zIndex: 30
            }}
          />
        </div>

        {/* Central Logo Container */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          className={cn(
            "relative z-20 bg-[#212121] flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden",
            containerSize,
            borderRadius
          )}
        >
          <img 
            src="/logo.png" 
            alt="ScénarIA" 
            className="w-full h-full object-cover opacity-90" 
          />
        </motion.div>
      </div>

      {showText && (title || description) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-center space-y-4"
        >
          {title && (
            <h2 className={cn("font-bold tracking-[0.3em] uppercase text-white font-poppins", fontSize)}>
              {title.includes('IA') ? (
                <>
                  {title.split('IA')[0]}
                  <span className="text-[#D4AF37]">IA</span>
                  {title.split('IA')[1]}
                </>
              ) : title}
            </h2>
          )}
          {description && (
            <p className={cn("text-white/30 font-bold uppercase tracking-[0.4em]", taglineSize)}>
              {description}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
};
