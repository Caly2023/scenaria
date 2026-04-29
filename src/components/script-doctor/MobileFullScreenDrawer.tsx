import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function MobileFullScreenDrawer({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (hidden but keeps consistent structure or provides slight dimming behind full-screen if needed) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          {/* Full Screen Drawer */}
          <motion.div
            key="drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[70] flex flex-col bg-background overflow-hidden"
            style={{ 
              height: '100dvh',
              paddingTop: 'env(safe-area-inset-top)'
            }}
          >
            {/* Grab Handle for Mobile */}
            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 md:hidden bg-background">
              <div className="w-12 h-1.5 bg-white/10 rounded-full" />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
