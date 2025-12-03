"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function UserPage() {
  const [streamKey, setStreamKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [stopInfo, setStopInfo] = useState("");
  const [stopError, setStopError] = useState("");
  const [ffmpegStatus, setFfmpegStatus] = useState<
    | { state: "idle" }
    | { state: "starting" }
    | { state: "started"; pid?: number; output?: string }
    | { state: "error"; message: string }
  >({ state: "idle" });

  const fetchKey = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/stream-key", { credentials: "include" });
      if (!res.ok) {
        setError("Нужно войти в аккаунт, чтобы увидеть ключ.");
        setStreamKey(null);
        return;
      }
      const data = await res.json();
      setStreamKey(data.streamKey);
    } catch {
      setError("Не удалось получить ключ.");
    } finally {
      setLoading(false);
    }
  };

  const regenerateKey = async () => {
    setError("");
    setRegenLoading(true);
    try {
      const res = await fetch("/api/stream-key", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setError("Не удалось обновить ключ. Убедитесь, что вы вошли.");
        return;
      }
      const data = await res.json();
      setStreamKey(data.streamKey);
    } catch {
      setError("Ошибка соединения при обновлении ключа.");
    } finally {
      setRegenLoading(false);
    }
  };

  const startFfmpeg = async () => {
    setFfmpegStatus({ state: "starting" });
    setError("");
    try {
      const res = await fetch("/api/ffmpeg", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          body?.message ||
          body?.error ||
          "Не удалось запустить ffmpeg. Проверьте вход и ключ потока.";
        setFfmpegStatus({ state: "error", message: msg });
        return;
      }
      const data = await res.json();
      setFfmpegStatus({
        state: "started",
        pid: data.pid,
        output: data.output,
      });
    } catch {
      setFfmpegStatus({
        state: "error",
        message: "Ошибка соединения с сервером при запуске ffmpeg.",
      });
    }
  };

  const stopStream = async () => {
    setStopError("");
    setStopInfo("");
    setStopLoading(true);
    try {
      const res = await fetch("/api/streams/stop", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === "unauthorized") {
          setStopError("Нужно войти, чтобы завершить стрим.");
        } else if (body?.error === "no_stream_key") {
          setStopError("Сначала сгенерируйте ключ стрима.");
        } else {
          setStopError("Не удалось завершить стрим.");
        }
        return;
      }
      const data = await res.json();
      setStopInfo(
        data?.removed
          ? "Стрим завершён."
          : "Стрим и так был офлайн.",
      );
    } catch {
      setStopError("Не удалось связаться с сервером.");
    } finally {
      setStopLoading(false);
    }
  };

  useEffect(() => {
    void fetchKey();
  }, []);

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold">Личный кабинет</h1>
          <Link
            href="/"
            className="text-sm border border-white/10 rounded-full px-4 py-2 hover:bg-white/10 transition"
          >
            ← На главную
          </Link>
        </div>
        <p className="text-zinc-400 mb-8">
          Здесь вы можете посмотреть и обновить ключ потока для OBS/RTMP.
        </p>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-zinc-400">Ключ потока</p>
              <h2 className="text-xl font-semibold">RTMP Stream Key</h2>
            </div>
            <button
              className="text-sm border border-white/20 rounded-full px-4 py-2 hover:bg-white/10 transition disabled:opacity-60"
              onClick={() => void regenerateKey()}
              disabled={regenLoading || loading}
            >
              {regenLoading ? "Обновляем..." : "Сгенерировать заново"}
            </button>
          </div>

          {loading ? (
            <p className="text-zinc-400 text-sm">Загружаем ключ...</p>
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : streamKey ? (
            <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 break-all font-mono text-sm">
              {streamKey}
            </div>
          ) : (
            <p className="text-zinc-400 text-sm">
              Ключ отсутствует. Создайте его заново.
            </p>
          )}

          <p className="text-xs text-zinc-500 mt-4">
            Держите ключ в секрете. Для потока в OBS используйте `rtmp://localhost/live/`
            и этот ключ в поле Stream Key.
          </p>
        </div>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-xl mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
    
              <h2 className="text-xl font-semibold">Запуск трансляции</h2>
            </div>
            <button
              className="text-sm border border-white/20 rounded-full px-4 py-2 hover:bg-white/10 transition disabled:opacity-60"
              onClick={() => void startFfmpeg()}
              disabled={loading || streamKey == null || ffmpegStatus.state === "starting"}
            >
              {ffmpegStatus.state === "starting" ? "Запускаем..." : "Запустить"}
            </button>
          </div>

         
          {ffmpegStatus.state === "started" ? (
            <div className="text-sm text-green-400 space-y-1">
              <p>ffmpeg запущен{ffmpegStatus.pid ? ` (PID ${ffmpegStatus.pid})` : ""}.</p>
              {ffmpegStatus.output ? (
                <p className="text-zinc-300">Вывод: {ffmpegStatus.output}</p>
              ) : null}
            </div>
          ) : ffmpegStatus.state === "error" ? (
            <p className="text-sm text-red-400">{ffmpegStatus.message}</p>
          ) : null}
        </div>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-xl mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              
              <h2 className="text-xl font-semibold">Остановить трансляцию</h2>
            </div>
            <button
              className="text-sm border border-white/20 rounded-full px-4 py-2 hover:bg-white/10 transition disabled:opacity-60"
              onClick={() => void stopStream()}
              disabled={stopLoading || loading || !streamKey}
            >
              {stopLoading ? "Очищаем..." : "Завершить стрим"}
            </button>
          </div>

          

          {stopError ? (
            <p className="text-sm text-red-400">{stopError}</p>
          ) : stopInfo ? (
            <p className="text-sm text-green-400">{stopInfo}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
