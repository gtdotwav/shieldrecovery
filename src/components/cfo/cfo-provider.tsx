"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";

type CfoMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  chipId?: string;
  chartData?: {
    type: "bar" | "line" | "donut" | "metric_cards";
    title?: string;
    labels: string[];
    datasets: Array<{ label: string; data: number[]; color?: string }>;
  };
};

type CfoContextValue = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  messages: CfoMessage[];
  isLoading: boolean;
  unreadCount: number;
  voiceMode: boolean;
  sendMessage: (text: string) => Promise<void>;
  sendChip: (chipId: string, label: string) => Promise<void>;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
  voiceWsUrl: string | null;
};

const CfoContext = createContext<CfoContextValue | null>(null);

export function useCfo() {
  const ctx = useContext(CfoContext);
  if (!ctx) throw new Error("useCfo must be used within CfoProvider");
  return ctx;
}

export function CfoProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CfoMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceWsUrl, setVoiceWsUrl] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  // Poll for unread insights every 60s
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch("/api/cfo/insights?limit=1");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch { /* silent */ }
    };
    fetchInsights();
    const interval = setInterval(fetchInsights, 60_000);
    return () => clearInterval(interval);
  }, []);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const close = useCallback(() => { setIsOpen(false); setVoiceMode(false); }, []);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: CfoMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/cfo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId: conversationIdRef.current }),
      });
      const data = await res.json();
      if (data.ok && data.reply) {
        setMessages(prev => [...prev, data.reply]);
        if (data.conversationId) conversationIdRef.current = data.conversationId;
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Erro ao processar. Tente novamente.", timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendChip = useCallback(async (chipId: string, label: string) => {
    const userMsg: CfoMessage = { role: "user", content: label, timestamp: new Date().toISOString(), chipId };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/cfo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chipId, conversationId: conversationIdRef.current }),
      });
      const data = await res.json();
      if (data.ok && data.reply) {
        setMessages(prev => [...prev, data.reply]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Erro ao buscar dados.", timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startVoice = useCallback(async () => {
    try {
      const res = await fetch("/api/cfo/voice", { method: "POST" });
      const data = await res.json();
      if (data.ok && data.wsUrl) {
        setVoiceWsUrl(data.wsUrl);
        setVoiceMode(true);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Modo reuniao indisponivel. Configure ELEVENLABS_API_KEY.", timestamp: new Date().toISOString() }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Erro ao iniciar modo reuniao.", timestamp: new Date().toISOString() }]);
    }
  }, []);

  const stopVoice = useCallback(() => {
    setVoiceMode(false);
    setVoiceWsUrl(null);
  }, []);

  return (
    <CfoContext.Provider value={{ isOpen, toggle, close, messages, isLoading, unreadCount, voiceMode, sendMessage, sendChip, startVoice, stopVoice, voiceWsUrl }}>
      {children}
    </CfoContext.Provider>
  );
}
