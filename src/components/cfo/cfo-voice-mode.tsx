"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useCfo } from "./cfo-provider";

export function CfoVoiceMode() {
  const { voiceWsUrl, stopVoice } = useCfo();
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
  }, []);

  const startAudioCapture = useCallback((stream: MediaStream, ws: WebSocket) => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (ws.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
        ws.send(JSON.stringify({ user_audio_chunk: base64 }));
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }, []);

  const playAudioChunk = useCallback(async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) return;
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      // Assume 16-bit PCM at 16kHz mono
      const float32 = new Float32Array(bytes.length / 2);
      const view = new DataView(bytes.buffer);
      for (let i = 0; i < float32.length; i++) {
        float32[i] = view.getInt16(i * 2, true) / 32768;
      }
      const buffer = audioContextRef.current.createBuffer(1, float32.length, 16000);
      buffer.getChannelData(0).set(float32);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch { /* ignore playback errors */ }
  }, []);

  const connect = useCallback(async () => {
    if (!voiceWsUrl) return;
    setError(null);

    try {
      // Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;

      // Create WebSocket
      const ws = new WebSocket(voiceWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsListening(true);
        startAudioCapture(stream, ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "audio") {
            setIsSpeaking(true);
            playAudioChunk(data.audio);
          } else if (data.type === "audio_end") {
            setIsSpeaking(false);
          } else if (data.type === "transcript" || data.type === "user_transcript") {
            if (data.text?.trim()) {
              setTranscript(prev => [...prev, { role: data.role || (data.type === "user_transcript" ? "user" : "agent"), text: data.text }]);
            }
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = () => setError("Erro na conexao de voz.");
      ws.onclose = () => { setIsConnected(false); setIsListening(false); };
    } catch {
      setError("Permissao de microfone negada.");
      cleanup();
    }
  }, [voiceWsUrl, cleanup, startAudioCapture, playAudioChunk]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const handleEnd = () => {
    cleanup();
    stopVoice();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-4">
      {error ? (
        <div className="text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={handleEnd} className="mt-3 text-xs text-[var(--accent)]">Voltar ao chat</button>
        </div>
      ) : (
        <>
          {/* Voice visualization */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full bg-[var(--accent)]/10 ${isSpeaking ? "animate-ping" : ""}`} />
            <div className={`absolute inset-2 rounded-full bg-[var(--accent)]/15 ${isListening ? "cfo-pulse" : ""}`} />
            <div className="relative w-20 h-20 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
              <div className="flex items-end gap-[3px] h-10">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-[var(--accent)] transition-all duration-150"
                    style={{
                      height: isSpeaking ? `${20 + Math.random() * 60}%` : isListening ? `${15 + Math.random() * 30}%` : "15%",
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {!isConnected ? "Conectando..." : isSpeaking ? "CFO esta falando..." : "Ouvindo..."}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">Modo Reuniao ativo</p>
          </div>

          {/* Transcript */}
          {transcript.length > 0 && (
            <div className="w-full max-h-40 overflow-y-auto px-2 space-y-2">
              {transcript.map((t, i) => (
                <div key={i} className={`text-xs ${t.role === "user" ? "text-[var(--muted)] text-right" : "text-[var(--foreground)]"}`}>
                  <span className="font-medium">{t.role === "user" ? "Voce" : "CFO"}:</span> {t.text}
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsListening(!isListening)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isListening ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "bg-gray-200 dark:bg-gray-700 text-[var(--muted)]"
              }`}
            >
              {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button
              onClick={handleEnd}
              className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
