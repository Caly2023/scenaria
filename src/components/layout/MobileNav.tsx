import React from 'react';
import { Sidebar } from './sidebar/Sidebar';

export function MobileNav() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-white/5 flex flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="h-18 flex items-end pb-0">
        <Sidebar variant="bottom-nav" />
      </div>
    </div>
  );
}
