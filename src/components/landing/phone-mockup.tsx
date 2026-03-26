"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, CreditCard } from "lucide-react";
import { platformBrand } from "@/lib/platform";

const b = platformBrand;

type Msg = {
  from: "bot" | "user" | "system";
  text: string;
  isButton?: boolean;
};

const MESSAGES: Msg[] = [
  {
    from: "bot",
    text: "Oi João! Notamos um problema no pagamento de R$197,00 no seu cartão.",
  },
  {
    from: "bot",
    text: "Preparamos um link seguro para você tentar novamente:",
  },
  { from: "bot", text: "Pagar R$197,00", isButton: true },
  { from: "user", text: "Pronto, paguei!" },
  { from: "system", text: "Pagamento confirmado — R$197,00" },
];

export function PhoneMockup({ className = "" }: { className?: string }) {
  const [count, setCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          animateMessages();
          ob.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  function animateMessages() {
    let i = 0;
    function next() {
      if (i >= MESSAGES.length) return;
      const msg = MESSAGES[i];
      if (msg.from === "bot") {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          i++;
          setCount(i);
          setTimeout(next, 600);
        }, 800);
      } else {
        i++;
        setCount(i);
        setTimeout(next, 900);
      }
    }
    setTimeout(next, 500);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Phone glow */}
      <div
        className="pointer-events-none absolute -inset-8 rounded-[3rem] opacity-30 blur-[60px]"
        style={{ background: `rgba(${b.accentRgb},0.15)` }}
      />

      {/* Phone frame */}
      <div
        className="relative w-[280px] overflow-hidden rounded-[2.2rem] border-[3px] shadow-[0_40px_80px_rgba(0,0,0,0.5)]"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "#0a0a0a",
        }}
      >
        {/* Dynamic island */}
        <div className="mx-auto mt-2.5 h-[22px] w-[90px] rounded-full bg-black" />

        {/* WhatsApp header */}
        <div
          className="mt-1 flex items-center gap-3 px-4 py-3"
          style={{ background: `linear-gradient(135deg, ${b.accent}, ${b.accentStrong})` }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
            PR
          </div>
          <div>
            <p className="text-[0.72rem] font-semibold text-white">{b.name}</p>
            <p className="text-[0.58rem] text-white/70">online</p>
          </div>
        </div>

        {/* Chat area */}
        <div
          className="flex min-h-[320px] flex-col gap-2 px-3 py-4"
          style={{
            background:
              "linear-gradient(180deg, #0d1117 0%, #0f1419 100%)",
          }}
        >
          {/* Today pill */}
          <div className="mx-auto mb-1 rounded-md bg-white/[0.06] px-3 py-0.5">
            <span className="text-[0.55rem] text-white/30">HOJE</span>
          </div>

          {MESSAGES.slice(0, count).map((msg, i) => (
            <ChatBubble key={i} msg={msg} index={i} />
          ))}

          {/* Typing indicator */}
          {typing && (
            <div className="flex items-end gap-1">
              <div className="rounded-xl rounded-bl-sm bg-white/[0.06] px-3 py-2.5">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ msg, index }: { msg: Msg; index: number }) {
  if (msg.from === "system") {
    return (
      <div
        className="phone-msg-enter mx-auto my-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5"
        style={{
          background: `rgba(${b.accentRgb},0.12)`,
          animationDelay: `${index * 80}ms`,
        }}
      >
        <CheckCheck className="h-3 w-3" style={{ color: b.accent }} />
        <span className="text-[0.62rem] font-medium" style={{ color: b.accent }}>
          {msg.text}
        </span>
      </div>
    );
  }

  const isUser = msg.from === "user";

  return (
    <div
      className={`phone-msg-enter flex ${isUser ? "justify-end" : "justify-start"}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className={`max-w-[85%] px-3 py-2 ${
          isUser
            ? "rounded-xl rounded-br-sm"
            : "rounded-xl rounded-bl-sm"
        }`}
        style={{
          background: isUser
            ? `rgba(${b.accentRgb},0.18)`
            : "rgba(255,255,255,0.06)",
        }}
      >
        {msg.isButton ? (
          <div
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[0.68rem] font-semibold text-white"
            style={{ background: b.accent }}
          >
            <CreditCard className="h-3 w-3" /> {msg.text}
          </div>
        ) : (
          <p
            className={`text-[0.68rem] leading-[1.5] ${
              isUser ? "text-white" : "text-white/80"
            }`}
          >
            {msg.text}
          </p>
        )}
        <div className="mt-0.5 flex items-center justify-end gap-1">
          <span className="text-[0.48rem] text-white/25">14:32</span>
          {isUser && <Check className="h-2.5 w-2.5 text-white/25" />}
        </div>
      </div>
    </div>
  );
}
