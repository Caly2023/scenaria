import React from 'react';
import { OrbitingLoader } from './OrbitingLoader';

export const LoadingPage: React.FC = () => {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Premium Background Atmosphere */}
      <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-[#D4AF37]/[0.03] rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[100px]" />
      
      <div className="relative z-10 scale-90 sm:scale-100">
        <OrbitingLoader 
          size="large"
          title="S C E N A R I A"
          description="L'IA au service de votre imagination"
        />
      </div>
    </div>
  );
};
