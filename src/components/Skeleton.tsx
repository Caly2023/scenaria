import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
  count?: number;
}

const pulseTransition = {
  duration: 1.5,
  repeat: Infinity,
  ease: "easeInOut" as const
};

export const TextSkeleton: React.FC<SkeletonProps> = ({ className, count = 1 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={pulseTransition}
          className={cn("h-4 bg-white/10 rounded-md w-full", className)}
        />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<SkeletonProps> = ({ className, count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={pulseTransition}
          className={cn("w-full h-32 bg-white/5 border border-white/10 rounded-[32px] p-6", className)}
        >
          <div className="h-6 bg-white/10 rounded-md w-1/3 mb-4" />
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded-md w-full" />
            <div className="h-4 bg-white/10 rounded-md w-5/6" />
          </div>
        </motion.div>
      ))}
    </>
  );
};

export const FormSkeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <motion.div className="h-3 w-16 bg-white/10 rounded-md" animate={{ opacity: [0.5, 1, 0.5] }} transition={pulseTransition} />
        <motion.div className="h-12 w-full bg-white/5 rounded-2xl" animate={{ opacity: [0.5, 1, 0.5] }} transition={pulseTransition} />
      </div>
      <div className="space-y-2">
        <motion.div className="h-3 w-20 bg-white/10 rounded-md" animate={{ opacity: [0.5, 1, 0.5] }} transition={pulseTransition} />
        <motion.div className="h-24 w-full bg-white/5 rounded-2xl" animate={{ opacity: [0.5, 1, 0.5] }} transition={pulseTransition} />
      </div>
    </div>
  );
};
