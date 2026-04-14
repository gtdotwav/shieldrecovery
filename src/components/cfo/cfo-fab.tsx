"use client";

import { Sparkles } from "lucide-react";
import { useCfo } from "./cfo-provider";

export function CfoFab() {
  const { toggle, isOpen, unreadCount } = useCfo();

  return (
    <button
      onClick={toggle}
      aria-label={isOpen ? "Fechar CFO" : "Abrir CFO Autonomo"}
      className={`
        fixed z-[60] bottom-20 right-4 md:bottom-6 md:right-6
        w-14 h-14 rounded-full
        bg-[var(--accent)] text-white
        flex items-center justify-center
        shadow-lg shadow-[var(--accent)]/25
        transition-all duration-300 ease-out
        hover:scale-110 active:scale-95
        ${isOpen ? "rotate-45 opacity-80" : "cfo-pulse"}
      `}
    >
      <Sparkles className="w-6 h-6" />
      {!isOpen && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-red-500 text-white text-[0.6rem] font-bold flex items-center justify-center px-1">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
