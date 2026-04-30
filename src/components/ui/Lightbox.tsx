import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LightboxProps {
  image: string | null;
  onClose: () => void;
  alt?: string;
}

export function Lightbox({ image, onClose, alt }: LightboxProps) {
  return (
    <AnimatePresence>
      {image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-12"
          onClick={onClose}
        >
          <button 
            className="absolute top-12 right-12 p-4 rounded-full bg-white/5 text-white hover:bg-white/10 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="w-8 h-8" />
          </button>
          <motion.img 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            src={image} 
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
            referrerPolicy="no-referrer"
            alt={alt || "Fullscreen view"}
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
