"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */

type FeedEntry = {
  id: number;
  kind: "system" | "out" | "link" | "pix" | "in" | "recovered";
  name: string;
  text: string;
  time: string;
};

type Scenario = {
  name: string;
  value: string;
  product: string;
  msg: string;
  link: string;
  extra?: { question: string; answer: string };
  reply: string;
};

/* ── Scenario pool ── */

const POOL: Scenario[] = [
  {
    name: "Mariana Costa",
    value: "R$ 2.497,00",
    product: "Plano Pro Anual",
    msg: "Oi Mariana! Notamos que seu pagamento do Plano Pro Anual de R$ 2.497,00 não foi processado. Pode ter sido um problema temporário com o cartão. Geramos um link seguro pra você 😊",
    link: "pay.pagrecovery.com/r/mcs-2497",
    reply: "Paguei via PIX agora! ✅",
  },
  {
    name: "Rafael Oliveira",
    value: "R$ 8.900,00",
    product: "Setup Enterprise",
    msg: "Rafael, tudo bem? Identificamos que a cobrança do Setup Enterprise (R$ 8.900,00) não foi aprovada. Isso pode acontecer por limite ou bloqueio temporário do banco.",
    link: "pay.pagrecovery.com/r/ro-8900",
    extra: { question: "Putz, deve ser o limite. Tem como pagar via PIX?", answer: "Tem sim! Segue o PIX abaixo para pagamento imediato:" },
    reply: "Feito! Paguei agora pelo app do banco",
  },
  {
    name: "Juliana Mendes",
    value: "R$ 1.450,00",
    product: "Licença Semestral",
    msg: "Olá Juliana! O pagamento da sua Licença Semestral de R$ 1.450,00 não foi concluído. Preparamos um link seguro para refazer o pagamento:",
    link: "pay.pagrecovery.com/r/jm-1450",
    reply: "Obrigada pelo aviso! Acabei de pagar pelo link ✅",
  },
  {
    name: "Thiago Almeida",
    value: "R$ 4.200,00",
    product: "Consultoria Premium",
    msg: "Oi Thiago! Vimos que o pagamento da Consultoria Premium de R$ 4.200,00 teve uma falha. Provavelmente algo pontual. Segue link para tentar novamente:",
    link: "pay.pagrecovery.com/r/ta-4200",
    reply: "Pronto, paguei no cartão ✅",
  },
  {
    name: "Fernanda Lima",
    value: "R$ 3.150,00",
    product: "Plano Business",
    msg: "Fernanda, boa tarde! Notamos que a cobrança do Plano Business de R$ 3.150,00 retornou com erro. Geramos um novo link de pagamento seguro:",
    link: "pay.pagrecovery.com/r/fl-3150",
    reply: "Pago! Obrigada pelo aviso 😊",
  },
  {
    name: "Carlos Eduardo",
    value: "R$ 1.997,00",
    product: "Assinatura Anual",
    msg: "Carlos, tudo bem? O pagamento da Assinatura Anual de R$ 1.997,00 não foi processado. Pode ter sido um bloqueio temporário. Segue link atualizado:",
    link: "pay.pagrecovery.com/r/ce-1997",
    extra: { question: "Posso pagar via PIX?", answer: "Claro! O link aceita PIX, cartão e boleto. Segue também o QR Code:" },
    reply: "Feito, paguei agora mesmo! Valeu",
  },
  {
    name: "Beatriz Nogueira",
    value: "R$ 299,00",
    product: "Plano Pro Mensal",
    msg: "Oi Bia! Seu pagamento do Plano Pro Mensal de R$ 299,00 não foi aprovado. Geramos um link rápido pra você:",
    link: "pay.pagrecovery.com/r/bn-299",
    reply: "Paguei! ✅",
  },
  {
    name: "Lucas Ferreira",
    value: "R$ 5.600,00",
    product: "Setup + Treinamento",
    msg: "Fala Lucas! A compra do Setup + Treinamento de R$ 5.600,00 teve uma falha no pagamento. Quer tentar de novo?",
    link: "pay.pagrecovery.com/r/lf-5600",
    extra: { question: "Opa! Pode mandar sim, vou tentar com outro cartão", answer: "Aqui está! Pode usar cartão, PIX ou boleto:" },
    reply: "Pronto, paguei no cartão do Nubank agora 👍",
  },
  {
    name: "Gabriela Santos",
    value: "R$ 6.800,00",
    product: "Mentoria VIP",
    msg: "Gabriela, boa tarde! O pagamento da Mentoria VIP de R$ 6.800,00 retornou como recusado. Geramos um novo link seguro:",
    link: "pay.pagrecovery.com/r/gs-6800",
    reply: "PIX feito agora! Obrigada 🎉",
  },
  {
    name: "Diego Martins",
    value: "R$ 2.890,00",
    product: "Plano Scale",
    msg: "Diego, tudo bem? A cobrança do Plano Scale de R$ 2.890,00 não foi concluída. Segue um link atualizado:",
    link: "pay.pagrecovery.com/r/dm-2890",
    reply: "Paguei via PIX, obrigado! ✅",
  },
  {
    name: "Larissa Souza",
    value: "R$ 4.500,00",
    product: "Pack Completo",
    msg: "Oi Larissa! O pagamento do Pack Completo de R$ 4.500,00 teve uma falha. Pode ter sido algo temporário. Link seguro abaixo:",
    link: "pay.pagrecovery.com/r/ls-4500",
    reply: "Feito! Valeu pelo lembrete 😊",
  },
  {
    name: "Bruno Costa",
    value: "R$ 3.600,00",
    product: "Licença Anual",
    msg: "Bruno, boa noite! O pagamento da Licença Anual de R$ 3.600,00 não foi aprovado pelo cartão. Geramos um novo link:",
    link: "pay.pagrecovery.com/r/bc-3600",
    extra: { question: "Acho que foi o limite, manda PIX que pago agora", answer: "Segue o QR Code PIX para pagamento imediato:" },
    reply: "Pago pelo PIX agora ✅ Obrigado!",
  },
  {
    name: "Camila Ferraz",
    value: "R$ 1.790,00",
    product: "Plano Growth",
    msg: "Camila, tudo bem? Notamos que o pagamento do Plano Growth de R$ 1.790,00 não foi processado. Segue link seguro:",
    link: "pay.pagrecovery.com/r/cf-1790",
    reply: "Paguei! Obrigada pela facilidade ✅",
  },
  {
    name: "Pedro Henrique",
    value: "R$ 12.000,00",
    product: "Enterprise Anual",
    msg: "Pedro, boa tarde! O pagamento do Enterprise Anual de R$ 12.000,00 retornou como recusado. Geralmente é proteção anti-fraude do banco.",
    link: "pay.pagrecovery.com/r/ph-12000",
    extra: { question: "Vou ligar pro banco pra liberar. Manda o link", answer: "Perfeito! Segue o link atualizado:" },
    reply: "Pago! Dessa vez foi 👍",
  },
  {
    name: "Amanda Rocha",
    value: "R$ 197,00",
    product: "Plano Starter",
    msg: "Amanda, oi! O pagamento do Plano Starter de R$ 197,00 não foi concluído. Segue link rápido para refazer:",
    link: "pay.pagrecovery.com/r/ar-197",
    reply: "Obrigada! Já paguei pelo link 😊",
  },
];

/* ── QR Code visual (procedural, looks real) ── */

function PixQR({ seed = 42 }: { seed?: number }) {
  const size = 21;
  const cells: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false) as boolean[]);

  const drawFinder = (ox: number, oy: number) => {
    for (let dy = 0; dy < 7; dy++) {
      for (let dx = 0; dx < 7; dx++) {
        const border = dy === 0 || dy === 6 || dx === 0 || dx === 6;
        const inner = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
        cells[oy + dy][ox + dx] = border || inner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);

  for (let i = 8; i < 13; i++) {
    cells[6][i] = i % 2 === 0;
    cells[i][6] = i % 2 === 0;
  }

  let s = seed;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (cells[y][x]) continue;
      if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue;
      if (y === 6 || x === 6) continue;
      s = ((s * 1103515245 + 12345) & 0x7fffffff) >>> 0;
      cells[y][x] = ((s >> 16) & 0xff) % 3 === 0;
    }
  }

  return (
    <div className="bg-white rounded-lg p-2.5 inline-block shadow-sm">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-20 h-20" shapeRendering="crispEdges">
        {cells.flatMap((row, y) =>
          row.map((on, x) =>
            on ? <rect key={`${y}-${x}`} x={x} y={y} width={1} height={1} fill="#000" /> : null,
          ),
        )}
      </svg>
      <p className="text-center text-[0.5rem] text-gray-400 mt-1 font-medium">PIX Copia e Cola</p>
    </div>
  );
}

/* ── Typing dots ── */

function TypingDots() {
  return (
    <div className="flex justify-end">
      <div className="rounded-2xl bg-[var(--accent)]/10 px-4 py-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 animate-bounce" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

/* ── Single feed bubble ── */

function Bubble({ item }: { item: FeedEntry }) {
  if (item.kind === "system") {
    return (
      <div className="flex justify-center feed-enter">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-[0.65rem] font-medium text-blue-600 dark:text-blue-400">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          {item.text}
        </span>
      </div>
    );
  }

  if (item.kind === "recovered") {
    return (
      <div className="flex justify-center feed-enter">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[0.65rem] font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Recuperado · {item.text}
        </span>
      </div>
    );
  }

  if (item.kind === "pix") {
    return (
      <div className="flex justify-end feed-enter">
        <PixQR seed={parseInt(item.text, 10) * 7919 + 31} />
      </div>
    );
  }

  if (item.kind === "link") {
    return (
      <div className="flex justify-end feed-enter">
        <div className="max-w-[80%] rounded-2xl bg-[var(--accent)]/10 px-3.5 py-2.5">
          <p className="text-[0.75rem] text-[var(--accent)] font-mono break-all">{item.text}</p>
          <span className="text-[0.55rem] text-gray-400 mt-1 block text-right">{item.time}</span>
        </div>
      </div>
    );
  }

  const isOut = item.kind === "out";

  return (
    <div className={cn("flex feed-enter", isOut ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2.5",
          isOut
            ? "bg-[var(--accent)]/10 text-gray-800 dark:text-gray-200"
            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
        )}
      >
        {!isOut && (
          <p className="text-[0.6rem] font-semibold text-gray-500 dark:text-gray-400 mb-1">{item.name}</p>
        )}
        <p className="text-[0.8rem] leading-relaxed whitespace-pre-line break-words">{item.text}</p>
        <div className={cn("mt-1 flex items-center gap-1.5", isOut ? "justify-end" : "")}>
          <span className="text-[0.55rem] text-gray-400">{item.time}</span>
          {isOut && <CheckCircle2 className="h-2.5 w-2.5 text-[var(--accent)]/50" />}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */

const MAX_FEED = 50;

function timeNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function LiveRecoveryFeed() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [count, setCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const idxRef = useRef(0);
  const cancelRef = useRef(false);

  const push = useCallback((entry: Omit<FeedEntry, "id" | "time">) => {
    const id = idRef.current++;
    setFeed((prev) => [...prev.slice(-(MAX_FEED - 1)), { ...entry, id, time: timeNow() }]);
  }, []);

  useEffect(() => {
    cancelRef.current = false;
    let timer: ReturnType<typeof setTimeout>;

    function wait(ms: number) {
      return new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms);
      });
    }

    async function run() {
      while (!cancelRef.current) {
        const s = POOL[idxRef.current % POOL.length];
        idxRef.current++;

        push({ kind: "system", name: s.name, text: `Nova recuperação · ${s.name} · ${s.value}` });
        await wait(1400);
        if (cancelRef.current) break;

        setTyping(true);
        await wait(900);
        if (cancelRef.current) break;
        setTyping(false);
        push({ kind: "out", name: s.name, text: s.msg });
        await wait(700);
        if (cancelRef.current) break;

        push({ kind: "link", name: s.name, text: s.link });
        await wait(500);
        if (cancelRef.current) break;

        push({ kind: "pix", name: s.name, text: String(idxRef.current) });
        await wait(1500);
        if (cancelRef.current) break;

        if (s.extra) {
          push({ kind: "in", name: s.name, text: s.extra.question });
          await wait(1200);
          if (cancelRef.current) break;
          setTyping(true);
          await wait(700);
          if (cancelRef.current) break;
          setTyping(false);
          push({ kind: "out", name: s.name, text: s.extra.answer });
          await wait(800);
          if (cancelRef.current) break;
        }

        await wait(2000 + Math.random() * 2500);
        if (cancelRef.current) break;

        push({ kind: "in", name: s.name, text: s.reply });
        await wait(900);
        if (cancelRef.current) break;

        push({ kind: "recovered", name: s.name, text: `${s.name} · ${s.value}` });
        setCount((c) => c + 1);
        await wait(3000);
      }
    }

    run();
    return () => {
      cancelRef.current = true;
      clearTimeout(timer);
    };
  }, [push]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [feed, typing]);

  return (
    <div className="relative flex flex-col h-[540px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-red-500">Ao vivo</span>
        </div>
        {count > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[0.65rem] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {count} recuperada{count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {feed.map((item) => (
          <Bubble key={item.id} item={item} />
        ))}
        {typing && <TypingDots />}
      </div>
    </div>
  );
}
