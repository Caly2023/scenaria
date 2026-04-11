import React from 'react';
import { motion } from 'motion/react';

export const LoadingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[120px]" />
      <div className="relative flex flex-col items-center space-y-8 text-center max-w-sm z-10">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} 
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} 
          className="w-16 h-16 relative"
        >
          <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-white rounded-full animate-spin" />
          <div className="absolute inset-0 blur-xl bg-white/20 rounded-full animate-pulse" />
        </motion.div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tighter italic">ScénarIA</h2>
          <p className="text-secondary text-sm font-medium tracking-tight animate-pulse">
            Initializing ScénarIA...
          </p>
        </div>
      </div>
    </div>
  );
};
