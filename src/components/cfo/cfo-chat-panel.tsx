"use client";

import { useState, useRef, useEffect } from "react";
import { X, Mic, Send, Brain, ArrowLeft, ChevronDown } from "lucide-react";
import { useCfo } from "./cfo-provider";
import { CfoQuickChips } from "./cfo-quick-chips";
import { CfoMessageBubble } from "./cfo-message-bubble";
import { CfoVoiceMode } from "./cfo-voice-mode";

export function CfoChatPanel() {
  const { isOpen, close, messages, isLoading, voiceMode, sendMessage, startVoice, stopVoice } = useCfo();
  const [input, setInput] = useState("");
  const [showChips, setShowChips] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && !voiceMode) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, voiceMode]);

  // Track if user scrolled up
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      setShowScrollDown(!atBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    setShowChips(false);
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile: fullscreen overlay */}
      <div
        className={`
          fixed z-[60] inset-0
          md:inset-auto md:bottom-22 md:right-6
          md:w-[420px] md:max-h-[min(75vh,640px)]
          cfo-slide-up
        `}
      >
        <div
          className={`
            flex flex-col h-full
            md:h-[min(75vh,640px)] md:rounded-2xl
            border-0 md:border md:border-[var(--border)]
            bg-[var(--surface)] md:bg-[var(--surface)]/98
            md:backdrop-blur-xl md:shadow-2xl md:shadow-black/20
            overflow-hidden
          `}
        >
          {/* Header — safe area top on mobile */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)] shrink-0"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <div className="flex items-center gap-3">
              {voiceMode ? (
                <button
                  onClick={stopVoice}
                  className="w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] active:bg-[var(--border)]/50 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 md:w-4 md:h-4" />
                </button>
              ) : (
                <button
                  onClick={close}
                  className="w-10 h-10 md:hidden rounded-xl flex items-center justify-center text-[var(--muted)] active:bg-[var(--border)]/50 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                <Brain className="w-5 h-5 md:w-4 md:h-4 text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="text-base md:text-sm font-semibold text-[var(--foreground)]">CFO Autonomo</h3>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? "bg-yellow-400 animate-pulse" : "bg-emerald-400"}`} />
                  <span className="text-xs md:text-[0.65rem] text-[var(--muted)]">
                    {isLoading ? "analisando..." : voiceMode ? "em reuniao" : "online"}
                  </span>
                </div>
              </div>
            </div>
            {/* Desktop close button (mobile uses back arrow) */}
            <button
              onClick={close}
              className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-[var(--muted)] hover:bg-[var(--border)]/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4 relative overscroll-contain">
            {voiceMode ? (
              <CfoVoiceMode />
            ) : messages.length === 0 && !showChips ? (
              <div className="flex flex-col justify-center min-h-full">
                <div className="text-center mb-8 md:mb-6">
                  <div className="w-16 h-16 md:w-12 md:h-12 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-4 md:mb-3">
                    <Brain className="w-8 h-8 md:w-6 md:h-6 text-[var(--accent)]" />
                  </div>
                  <p className="text-base md:text-sm font-medium text-[var(--foreground)]">Ola! Sou seu CFO Autonomo.</p>
                  <p className="text-sm md:text-xs text-[var(--muted)] mt-1">Opero sua receita 24/7. Como posso ajudar?</p>
                </div>
                <CfoQuickChips />
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <CfoMessageBubble key={i} message={msg} />
                ))}
                {isLoading && (
                  <div className="flex items-center gap-1.5 px-3 py-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
                {showChips && (
                  <div className="pt-2">
                    <CfoQuickChips />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Scroll-to-bottom indicator */}
            {showScrollDown && !voiceMode && messages.length > 0 && (
              <button
                onClick={scrollToBottom}
                className="sticky bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors z-10"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Footer — safe area bottom on mobile */}
          {!voiceMode && (
            <div
              className="px-4 md:px-3 py-3 border-t border-[var(--border)] bg-[var(--surface)] shrink-0"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={startVoice}
                  title="Modo Reuniao (voz)"
                  className="w-11 h-11 md:w-9 md:h-9 rounded-xl md:rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 active:bg-[var(--accent)]/20 transition-colors shrink-0"
                >
                  <Mic className="w-5 h-5 md:w-4 md:h-4" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte sobre sua operacao..."
                  className="flex-1 h-11 md:h-9 px-4 md:px-3 rounded-xl md:rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/50 transition-colors"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-11 h-11 md:w-9 md:h-9 rounded-xl md:rounded-lg flex items-center justify-center bg-[var(--accent)] text-white disabled:opacity-40 transition-all hover:brightness-110 active:scale-95 shrink-0"
                >
                  <Send className="w-5 h-5 md:w-4 md:h-4" />
                </button>
              </div>
              {messages.length > 0 && (
                <div className="mt-2 flex justify-center">
                  <button
                    onClick={() => setShowChips(prev => !prev)}
                    className="text-xs md:text-[0.65rem] text-[var(--muted)] hover:text-[var(--accent)] active:text-[var(--accent)] transition-colors py-1"
                  >
                    {showChips ? "Ocultar acoes rapidas" : "Ver acoes rapidas"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
