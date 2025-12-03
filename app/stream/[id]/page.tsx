"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import VideoPlayer from "@/components/VideoPlayer";

type StreamInfo = { id: string; playlist: string };
type User = { id: string; email: string };
type ChatMessage = {
  id: string;
  userId: string;
  userEmail: string;
  text: string;
  createdAt: string;
};

export default function StreamPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [info, setInfo] = useState<StreamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playerError, setPlayerError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<"loading" | "ready">("loading");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Не указан идентификатор стрима.");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/streams/${encodeURIComponent(id)}`);
        if (!res.ok) {
          setError("Плейлист не найден. Проверьте, запущен ли стрим.");
          setInfo(null);
          return;
        }
        const data = await res.json();
        setInfo(data);
      } catch {
        setError("Ошибка загрузки данных о стриме.");
        setInfo(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setAuthStatus("ready");
      }
    };

    void checkAuth();
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadChat = async () => {
      setChatError("");
      try {
        const res = await fetch(`/api/streams/${encodeURIComponent(id)}/chat`);
        if (!res.ok) {
          if (!cancelled) setChatError("Не удалось загрузить чат.");
          if (!cancelled) setChatMessages([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setChatMessages(Array.isArray(data.messages) ? data.messages : []);
        }
      } catch {
        if (!cancelled) {
          setChatError("Не удалось загрузить чат.");
        }
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    };

    void loadChat();
    const interval = setInterval(loadChat, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  useEffect(() => {
    const el = chatListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages.length]);

  const handleSend = async () => {
    if (!id || !chatInput.trim() || sending) return;
    setSending(true);
    setChatError("");
    try {
      const res = await fetch(`/api/streams/${encodeURIComponent(id)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: chatInput }),
      });

      if (res.status === 401) {
        setChatError("Только авторизованные пользователи могут писать в чат.");
        setUser(null);
        return;
      }

      if (!res.ok) {
        setChatError("Не удалось отправить сообщение.");
        return;
      }

      const data = await res.json();
      setChatInput("");
      setChatMessages((prev) => [...prev, data.message].slice(-200));
    } catch {
      setChatError("Не удалось отправить сообщение.");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (value: string) => {
    try {
      return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans px-6 py-8">
      <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto">
        <div>
          <p className="text-sm text-zinc-400">Прямой эфир</p>
          <h1 className="text-3xl font-bold">Stream: {id}</h1>
        </div>
        <Link
          href="/"
          className="text-sm border border-white/10 rounded-full px-4 py-2 hover:bg-white/10 transition"
        >
          ← На главную
        </Link>
      </div>

      <div className="max-w-5xl mx-auto">
        {loading ? (
          <p className="text-zinc-400">Загружаем плейлист…</p>
        ) : error ? (
          <div className="bg-zinc-900 border border-red-500/40 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
            <p className="text-sm text-zinc-500 mt-2">
              Убедитесь, что ffmpeg пишет в streams/{id}/index.m3u8 и плейлист доступен.
            </p>
          </div>
        ) : info ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black/60 relative">
                <VideoPlayer
                  key={info.playlist}
                  src={info.playlist}
                  onError={(msg) => setPlayerError(msg)}
                  onReady={() => setPlayerError("")}
                />
              </div>
              <p className="text-sm text-zinc-400">
                Источник: {info.playlist}
              </p>
              {playerError ? (
                <p className="text-sm text-red-400">
                  Ошибка плеера: {playerError}. Проверьте доступность плейлиста и сегментов.
                </p>
              ) : (
                <p className="text-sm text-zinc-500">
                  Если воспроизведение не началось, попробуйте нажать Play в плеере или обновить страницу.
                </p>
              )}
            </div>

            <aside className="bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-4 h-fit">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-400">Чат стрима</p>
                </div>
                <span className="text-xs text-zinc-500 text-right">
                  {authStatus === "loading"
                    ? "Проверяем вход..."
                    : user
                      ? user.email
                      : "Только для авторизованных"}
                </span>
              </div>

              <div
                ref={chatListRef}
                className="min-h-[260px] max-h-[360px] overflow-y-auto rounded-xl border border-white/5 bg-black/30 p-3 space-y-3"
              >
                {chatLoading ? (
                  <p className="text-sm text-zinc-500">Загружаем историю чата…</p>
                ) : chatMessages.length === 0 ? (
                  <p className="text-sm text-zinc-500">Пока нет сообщений. Будьте первым!</p>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-white/5 rounded-lg px-3 py-2 border border-white/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-green-300 font-semibold">
                          {msg.userEmail}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-white mt-1 whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {chatError ? (
                <p className="text-sm text-red-400">{chatError}</p>
              ) : null}

              {user ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm resize-none focus:outline-none focus:border-white/30"
                    rows={3}
                    placeholder="Напишите сообщение..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">
                      Ограничение 500 символов
                    </p>
                    <button
                      className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-zinc-200 transition disabled:opacity-60"
                      onClick={() => void handleSend()}
                      disabled={sending || !chatInput.trim()}
                    >
                      {sending ? "Отправляем..." : "Отправить"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300 space-y-2">
                  <p>Войдите в аккаунт, чтобы общаться в чате во время просмотра.</p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs text-black bg-white px-3 py-1.5 rounded-full font-semibold hover:bg-zinc-200 transition"
                  >
                    Перейти к входу
                  </Link>
                </div>
              )}
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
