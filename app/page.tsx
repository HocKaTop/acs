"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useHLSVideo } from "@/hooks/use-hls-video";

interface Stream {
  id: string;
  playlist: string;
  categoryId?: string;
  category?: { id: string; name: string } | null;
  thumbnail?: string;
}

export default function Home() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [authStatus, setAuthStatus] = useState<"loading" | "ready">("loading");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
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
      }
      setAuthStatus("ready");
    };

    void check();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAuthOpen(false);
      }
    };
    if (authOpen) {
      document.addEventListener("keydown", onKey);
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [authOpen]);

  useEffect(() => {
    const loadStreams = async () => {
      setStreamsLoading(true);
      try {
        const res = await fetch("/api/streams");
        if (!res.ok) {
          setStreams([]);
          return;
        }
        const data = await res.json();
        const streamsWithThumbnails = await Promise.all(
          (data.streams ?? []).map(async (stream: Stream) => {
            try {
              const thumbRes = await fetch(`/api/streams/${stream.id}/thumbnail`);
              if (thumbRes.ok) {
                const thumbData = await thumbRes.json();
                return {
                  ...stream,
                  thumbnail: thumbData.thumbnail,
                };
              }
            } catch (err) {
              console.error(`Error loading thumbnail for ${stream.id}:`, err);
            }
            return stream;
          })
        );
        setStreams(streamsWithThumbnails);
      } catch {
        setStreams([]);
      } finally {
        setStreamsLoading(false);
      }
    };

    void loadStreams();
  }, []);

  const handleAuthSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const endpoint = mode === "login" ? "/api/login" : "/api/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setAuthOpen(false);
        setPassword("");
        setEmail(data.user?.email ?? email);
        setError("");
      } else {
        const body = await res.json().catch(() => ({}));
        if (body?.error === "email_taken") {
          setError("Такой email уже зарегистрирован.");
        } else if (body?.error === "invalid_credentials") {
          setError("Неверная пара email/пароль.");
        } else {
          setError("Не удалось выполнить запрос.");
        }
      }
    } catch {
      setError("Не удалось связаться с сервером.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setPassword("");
  };
  const closeAuth = () => {
    setAuthOpen(false);
    setError("");
  };

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans">
      {/* Header */}
      <header className="w-full py-6 px-10 flex items-center justify-between border-b border-white/10">
        <h1 className="text-2xl font-bold tracking-tight">Chisinau TV</h1>
        <nav className="flex items-center gap-8 text-lg">
          <a className="hover:text-zinc-300 transition" href="#">Главная</a>
          <a className="hover:text-zinc-300 transition" href="/categories">Категории</a>
        </nav>
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <span className="text-xs uppercase tracking-wide text-zinc-400">
            {user ? "Аккаунт" : authStatus === "loading" ? "Проверяем" : "Гость"}
          </span>
          <span className="font-medium truncate max-w-[180px]">
            {user ? user.email : authStatus === "loading" ? "..." : "Без входа"}
          </span>
          {user ? (
            <>
              <Link
                href="/user"
                className="text-xs border border-white/10 rounded-full px-3 py-1 hover:bg-white/5 transition"
              >
                Личный кабинет
              </Link>
              <button
                className="text-xs text-red-300 border border-white/10 rounded-full px-3 py-1 hover:bg-white/5 transition"
                onClick={() => void handleLogout()}
              >
                Выйти
              </button>
            </>
          ) : (
            <button
              className="text-xs bg-white text-black rounded-full px-4 py-2 font-semibold hover:bg-zinc-200 transition"
              onClick={() => setAuthOpen(true)}
            >
              Войти / Регистрация
            </button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="px-10 py-20 flex flex-col items-start gap-6 max-w-3xl">
        <h2 className="text-5xl font-extrabold leading-tight">
          Добро пожаловать в Chisinau TV
        </h2>
        <div className="flex flex-wrap gap-3">
          {!user ? (
            <button
              className="rounded-full border border-white/30 px-8 py-3 font-semibold text-lg hover:bg-white/5 transition"
              onClick={() => {
                setMode("register");
                setAuthOpen(true);
              }}
            >
              Создать аккаунт
            </button>
          ) : null}
        </div>
      </section>

      {/* Stream Grid */}
      <section className="px-10 pb-20">
        <h3 className="text-3xl font-bold mb-8">Текущие стримы</h3>

        {streamsLoading ? (
          <p className="text-zinc-400">Загружаем список стримов…</p>
        ) : streams.length === 0 ? (
          <p className="text-zinc-500">
            Пока нет активных плейлистов. Запустите ffmpeg для вашего ключа, чтобы появиться здесь.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {streams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} user={user} />
            ))}
          </div>
        )}
      </section>

      {/* Auth overlay */}
      {authOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={closeAuth}
        >
          <div
            className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-3 top-3 text-zinc-400 hover:text-white"
              onClick={closeAuth}
              aria-label="Закрыть"
            >
              ✕
            </button>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-zinc-400">Доступ к аккаунту</p>
                <h3 className="text-xl font-semibold">
                  {user ? "Вы уже вошли" : mode === "login" ? "Вход" : "Регистрация"}
                </h3>
              </div>
              {!user ? (
                <div className="flex bg-white/5 rounded-full p-1">
                  <button
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      mode === "login" ? "bg-white text-black" : "text-white"
                    }`}
                    onClick={() => setMode("login")}
                  >
                    Вход
                  </button>
                  <button
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      mode === "register" ? "bg-white text-black" : "text-white"
                    }`}
                    onClick={() => setMode("register")}
                  >
                    Регистрация
                  </button>
                </div>
              ) : null}
            </div>

            {authStatus === "loading" ? (
              <p className="text-zinc-400 text-sm">Проверяем авторизацию…</p>
            ) : user ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-300">
                  Вы вошли как <span className="font-semibold">{user.email}</span>.
                  Контент и так доступен, аккаунт нужен для персонализации.
                </p>
                <button
                  className="w-full rounded-lg bg-white text-black px-4 py-3 font-semibold hover:bg-zinc-200 transition"
                  onClick={() => {
                    void handleLogout();
                    closeAuth();
                  }}
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full rounded-lg bg-zinc-900 border border-white/10 px-4 py-3 outline-none focus:border-white/30"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleAuthSubmit();
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2" htmlFor="password">
                    Пароль
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="w-full rounded-lg bg-zinc-900 border border-white/10 px-4 py-3 outline-none focus:border-white/30"
                    placeholder="минимум 6 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleAuthSubmit();
                      }
                    }}
                  />
                </div>

                {error ? (
                  <p className="text-sm text-red-400">{error}</p>
                ) : (
                  <p className="text-sm text-zinc-400">
                    Контент открыт всем. Войдите или зарегистрируйтесь для сохранения настроек.
                  </p>
                )}

                <button
                  className="w-full rounded-lg bg-white text-black px-4 py-3 font-semibold hover:bg-zinc-200 transition disabled:opacity-60"
                  onClick={() => void handleAuthSubmit()}
                  disabled={submitting}
                >
                  {submitting
                    ? "Отправляем..."
                    : mode === "login"
                      ? "Войти"
                      : "Зарегистрироваться"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface StreamCardProps {
  stream: Stream;
  user: { id: string; email: string } | null;
}

function StreamCard({ stream, user }: StreamCardProps) {
  const videoRef = useHLSVideo(stream.thumbnail);

  return (
    <Link
      href={`/stream/${stream.id}`}
      className="group relative rounded-2xl overflow-hidden bg-zinc-900 shadow-xl border border-white/5 hover:-translate-y-1 transition"
    >
      <div className="h-48 bg-zinc-800 flex items-center justify-center relative overflow-hidden">
        {stream.thumbnail ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            loop
            autoPlay
            playsInline
          />
        ) : (
          <span className="text-zinc-500 group-hover:text-white transition">
            {stream.id.slice(0, 8)}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition" />
      </div>

      <div className="p-5 flex flex-col gap-2">
        <h4 className="font-semibold text-xl truncate">{user?.email}</h4>
        {stream.category && (
          <div
            className="text-zinc-400 text-sm hover:text-white transition cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (stream.category) {
                window.location.href = `/categories/${stream.category.id}`;
              }
            }}
          >
            {stream.category.name}
          </div>
        )}
        <span className="text-green-400 text-sm font-medium">● Live</span>
      </div>
    </Link>
  );
}
