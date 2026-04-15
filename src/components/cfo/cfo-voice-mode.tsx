"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, PhoneOff, RotateCcw } from "lucide-react";
import { useCfo } from "./cfo-provider";

type VoiceState = "connecting" | "listening" | "speaking" | "error";

/* ── Helpers ── */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function CfoVoiceMode() {
  const { voiceConfig, stopVoice, startVoice } = useCfo();
  const [state, setState] = useState<VoiceState>("connecting");
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const sampleRateRef = useRef(16000);
  const mutedRef = useRef(false);
  const connectingRef = useRef(false); // Guard against StrictMode double-connect
  const mountedRef = useRef(true);

  // Keep mutedRef in sync
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const cleanup = useCallback(() => {
    connectingRef.current = false;
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  /* ── Audio playback queue ── */
  const playNextInQueue = useCallback(async () => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === "closed" || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setState(prev => prev === "speaking" ? "listening" : prev);
      return;
    }
    isPlayingRef.current = true;
    setState("speaking");

    const pcmBuffer = audioQueueRef.current.shift()!;
    const int16 = new Int16Array(pcmBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, sampleRateRef.current);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => playNextInQueue();
    source.start();
  }, []);

  const enqueueAudio = useCallback((base64: string) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      audioQueueRef.current.push(bytes.buffer);
      if (!isPlayingRef.current) playNextInQueue();
    } catch { /* ignore decode errors */ }
  }, [playNextInQueue]);

  /* ── Mic capture → WebSocket ── */
  const startAudioCapture = useCallback((stream: MediaStream, ws: WebSocket) => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN || mutedRef.current) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
      }
      const base64 = arrayBufferToBase64(pcm16.buffer);
      ws.send(JSON.stringify({ user_audio_chunk: base64 }));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }, []);

  /* ── WebSocket connection ── */
  const connect = useCallback(async () => {
    if (!voiceConfig) return;

    // Guard: prevent StrictMode double-connect (signed URL is single-use)
    if (connectingRef.current || wsRef.current) return;
    connectingRef.current = true;

    setError(null);
    setState("connecting");

    try {
      // Request mic first
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      // Check if we were unmounted during the mic permission dialog
      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;

      const ws = new WebSocket(voiceConfig.wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send dynamic config override with seller data + system prompt + dynamic variables
        // This MUST be the first message, before conversation_initiation_metadata arrives
        // Note: first_message override is NOT allowed by ElevenLabs client config —
        // it must be set on the agent dashboard. We only override the prompt here.
        const override: Record<string, unknown> = {
          type: "conversation_initiation_client_data",
          conversation_config_override: {
            agent: {
              prompt: { prompt: voiceConfig.systemPrompt },
            },
          },
          dynamic_variables: {
            seller_key: voiceConfig.sellerKey || "",
          },
        };
        ws.send(JSON.stringify(override));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "conversation_initiation_metadata":
              // Connection fully established — now start sending audio
              setState("listening");
              if (data.conversation_initiation_metadata_event?.agent_output_audio_format) {
                const fmt = data.conversation_initiation_metadata_event.agent_output_audio_format;
                const match = fmt.match(/pcm_(\d+)/);
                if (match) sampleRateRef.current = parseInt(match[1], 10);
              }
              startAudioCapture(stream, ws);
              break;

            case "audio":
              if (data.audio_event?.audio_base_64) {
                enqueueAudio(data.audio_event.audio_base_64);
              }
              break;

            case "agent_response":
              if (data.agent_response_event?.agent_response?.trim()) {
                setTranscript(prev => [...prev, { role: "agent", text: data.agent_response_event.agent_response }]);
              }
              break;

            case "user_transcript":
              if (data.user_transcription_event?.user_transcript?.trim()) {
                setTranscript(prev => [...prev, { role: "user", text: data.user_transcription_event.user_transcript }]);
              }
              break;

            case "interruption":
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              setState("listening");
              break;

            case "ping":
              if (data.ping_event?.event_id != null) {
                ws.send(JSON.stringify({ type: "pong", event_id: data.ping_event.event_id }));
              }
              break;

            case "agent_response_correction":
              if (data.agent_response_correction_event?.corrected_agent_response) {
                setTranscript(prev => {
                  const copy = [...prev];
                  for (let i = copy.length - 1; i >= 0; i--) {
                    if (copy[i].role === "agent") {
                      copy[i] = { role: "agent", text: data.agent_response_correction_event.corrected_agent_response };
                      break;
                    }
                  }
                  return copy;
                });
              }
              break;
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = () => {
        // Cleanup resources on WebSocket error — onerror is always followed by onclose,
        // but we clean up immediately to stop mic/audio leaking
        cleanup();
      };

      ws.onclose = (e) => {
        console.warn(`[cfo-voice] WebSocket closed: code=${e.code} reason=${e.reason}`);
        cleanup();
        if (!mountedRef.current) return;
        if (e.code !== 1000) {
          setError(`Conexão encerrada (código ${e.code}${e.reason ? `: ${e.reason}` : ""}). Tente novamente.`);
          setState("error");
        }
      };
    } catch (err) {
      connectingRef.current = false;
      const msg = err instanceof Error && err.name === "NotAllowedError"
        ? "Permissão de microfone negada. Habilite nas configurações do navegador."
        : `Erro ao acessar microfone: ${err instanceof Error ? err.message : "desconhecido"}`;
      setError(msg);
      setState("error");
      cleanup();
    }
  }, [voiceConfig, cleanup, startAudioCapture, enqueueAudio]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [connect, cleanup]);

  const handleEnd = () => {
    cleanup();
    stopVoice();
  };

  const handleRetry = async () => {
    cleanup();
    setError(null);
    setState("connecting");
    // Re-fetch a fresh signed URL then reconnect
    await startVoice();
  };

  const toggleMute = () => setMuted(prev => !prev);

  const statusText = {
    connecting: "Conectando ao CFO...",
    listening: "Ouvindo você...",
    speaking: "CFO está falando...",
    error: "Erro na conexão",
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-4">
      {state === "error" ? (
        <div className="text-center px-4">
          <p className="text-sm text-red-400">{error}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button onClick={handleRetry} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors">
              <RotateCcw className="h-3.5 w-3.5" />
              Tentar novamente
            </button>
            <button onClick={handleEnd} className="px-4 py-2 text-xs rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors">
              Voltar ao chat
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Voice visualization */}
          <div className="relative w-40 h-40 md:w-32 md:h-32 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full bg-[var(--accent)]/10 transition-opacity duration-300 ${state === "speaking" ? "animate-ping opacity-100" : "opacity-0"}`} />
            <div className={`absolute inset-2 rounded-full bg-[var(--accent)]/15 transition-opacity ${state !== "connecting" ? "cfo-pulse opacity-100" : "opacity-30"}`} />
            <div className="relative w-24 h-24 md:w-20 md:h-20 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
              <div className="flex items-end gap-1 md:gap-[3px] h-12 md:h-10">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-[var(--accent)] transition-all duration-150"
                    style={{
                      height: state === "speaking"
                        ? `${20 + Math.random() * 60}%`
                        : state === "listening" && !muted
                          ? `${15 + Math.random() * 30}%`
                          : "15%",
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-base md:text-sm font-medium text-[var(--foreground)]">{statusText[state]}</p>
            <p className="text-sm md:text-xs text-[var(--muted)] mt-1">
              {muted ? "Microfone desativado" : "Modo Reunião ativo"}
            </p>
          </div>

          {/* Transcript */}
          {transcript.length > 0 && (
            <div className="w-full flex-1 max-h-48 md:max-h-40 overflow-y-auto px-2 space-y-2">
              {transcript.map((t, i) => (
                <div key={i} className={`text-sm md:text-xs ${t.role === "user" ? "text-[var(--muted)] text-right" : "text-[var(--foreground)]"}`}>
                  <span className="font-medium">{t.role === "user" ? "Você" : "CFO"}:</span> {t.text}
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-6 md:gap-4 pb-4 md:pb-0">
            <button
              onClick={toggleMute}
              className={`w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors ${
                !muted
                  ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                  : "bg-red-500/20 text-red-400"
              }`}
              title={muted ? "Ativar microfone" : "Desativar microfone"}
            >
              {!muted ? <Mic className="w-6 h-6 md:w-5 md:h-5" /> : <MicOff className="w-6 h-6 md:w-5 md:h-5" />}
            </button>
            <button
              onClick={handleEnd}
              className="w-16 h-16 md:w-14 md:h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 active:bg-red-700 transition-colors shadow-lg"
              title="Encerrar reunião"
            >
              <PhoneOff className="w-6 h-6 md:w-5 md:h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
