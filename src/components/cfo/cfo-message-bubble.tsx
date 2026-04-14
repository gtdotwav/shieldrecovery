"use client";

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

export function CfoMessageBubble({ message }: { message: CfoMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in-up`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
        isUser
          ? "bg-[var(--accent)] text-white rounded-br-md"
          : "bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-md"
      }`}>
        {/* Text content with basic markdown */}
        <div className={`text-[0.8rem] leading-relaxed whitespace-pre-wrap ${isUser ? "" : "cfo-markdown"}`}>
          {renderContent(message.content)}
        </div>

        {/* Chart visualization */}
        {message.chartData && !isUser && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]/50">
            <CfoMiniChart chart={message.chartData} />
          </div>
        )}

        {/* Timestamp */}
        <p className={`text-[0.6rem] mt-1.5 ${isUser ? "text-white/60" : "text-[var(--muted)]"}`}>
          {new Date(message.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function renderContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/^• /, "\u2192 ");
    return <span key={i} dangerouslySetInnerHTML={{ __html: processed + (i < lines.length - 1 ? "<br/>" : "") }} />;
  });
}

function CfoMiniChart({ chart }: { chart: NonNullable<CfoMessage["chartData"]> }) {
  const dataset = chart.datasets[0];
  if (!dataset) return null;
  const maxVal = Math.max(...dataset.data, 1);

  if (chart.type === "metric_cards") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {chart.labels.map((label, i) => (
          <div key={label} className="rounded-lg bg-[var(--surface)] p-2 text-center">
            <p className="text-lg font-bold text-[var(--accent)] tabular-nums">{dataset.data[i]}</p>
            <p className="text-[0.6rem] text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>
    );
  }

  if (chart.type === "donut") {
    const total = dataset.data.reduce((s, v) => s + v, 0);
    const colors = ["var(--accent)", "#3b82f6", "#8b5cf6", "#ec4899"];
    return (
      <div className="space-y-1.5">
        {chart.title && <p className="text-[0.65rem] font-semibold text-[var(--muted)]">{chart.title}</p>}
        {chart.labels.map((label, i) => {
          const pct = total > 0 ? Math.round(dataset.data[i] / total * 100) : 0;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="text-[0.7rem] text-[var(--foreground)] flex-1">{label}</span>
              <span className="text-[0.7rem] text-[var(--muted)] tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Bar chart (default for "bar" and "line")
  return (
    <div className="space-y-1.5">
      {chart.title && <p className="text-[0.65rem] font-semibold text-[var(--muted)]">{chart.title}</p>}
      {chart.labels.map((label, i) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[0.65rem] text-[var(--foreground)]">{label}</span>
            <span className="text-[0.65rem] text-[var(--muted)] tabular-nums">{dataset.data[i]}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--border)]">
            <div
              className="h-1.5 rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${(dataset.data[i] / maxVal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
