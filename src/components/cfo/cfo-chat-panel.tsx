"use client";

import { useState, useRef, useEffect } from "react";
import { X, Mic, Send, Brain, ArrowLeft } from "lucide-react";
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && !voiceMode) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, voiceMode]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed z-[59] bottom-36 right-4 md:bottom-22 md:right-6 w-[calc(100vw-2rem)] max-w-[420px] cfo-slide-up">
      <div className="flex flex-col h-[min(70vh,600px)] rounded-2xl border border-[var(--border)] bg-[var(--surface)]/98 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            {voiceMode && (
              <button onClick={stopVoice} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">CFO Autonomo</h3>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? "bg-yellow-400 animate-pulse" : "bg-emerald-400"}`} />
                <span className="text-[0.65rem] text-[var(--muted)]">
                  {isLoading ? "analisando..." : voiceMode ? "em reuniao" : "online"}
                </span>
              </div>
            </div>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--border)]/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {voiceMode ? (
            <CfoVoiceMode />
          ) : messages.length === 0 && !showChips ? (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-3">
                  <Brain className="w-6 h-6 text-[var(--accent)]" />
                </div>
                <p className="text-sm font-medium text-[var(--foreground)]">Ola! Sou seu CFO Autonomo.</p>
                <p className="text-xs text-[var(--muted)] mt-1">Opero sua receita 24/7. Como posso ajudar?</p>
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
        </div>

        {/* Footer */}
        {!voiceMode && (
          <div className="px-3 py-3 border-t border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center gap-2">
              <button
                onClick={startVoice}
                title="Modo Reuniao (voz)"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors shrink-0"
              >
                <Mic className="w-4 h-4" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre sua operacao..."
                className="flex-1 h-9 px-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/50 transition-colors"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--accent)] text-white disabled:opacity-40 transition-all hover:brightness-110 active:scale-95 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {messages.length > 0 && (
              <div className="mt-2 flex justify-center">
                <button
                  onClick={() => setShowChips(prev => !prev)}
                  className="text-[0.65rem] text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                >
                  {showChips ? "Ocultar acoes rapidas" : "Ver acoes rapidas"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
