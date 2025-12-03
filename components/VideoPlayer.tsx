"use client";

import { useEffect, useRef } from "react";
import type HlsType from "hls.js";

type VideoPlayerProps = {
  src: string;
  className?: string;
  onError?: (message: string) => void;
  onReady?: () => void;
};

export default function VideoPlayer({
  src,
  className,
  onError,
  onReady,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const onErrorRef = useRef<typeof onError>();
  const onReadyRef = useRef<typeof onReady>();

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const setup = async () => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      const resolvedSrc =
        typeof window !== "undefined"
          ? new URL(src, window.location.href).toString()
          : src;

      // нативное воспроизведение HLS (Safari / некоторые браузеры)
      if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
        videoEl.src = resolvedSrc;
        videoEl.muted = true;
        try {
          await videoEl.play();
          onReadyRef.current?.();
        } catch {
          /* autoplay может быть заблокирован */
        }
        return;
      }

      // fallback на hls.js
      try {
        const Hls = (await import("hls.js")).default as typeof HlsType;
        if (!Hls.isSupported()) {
          onErrorRef.current?.("HLS не поддерживается этим браузером");
          return;
        }

        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            onErrorRef.current?.(`HLS ошибка: ${data.details ?? "fatal"}`);
          }
        });

        hls.attachMedia(videoEl);
        hls.loadSource(resolvedSrc);
        videoEl.muted = true;
        await videoEl.play().catch(() => {
          /* autoplay может быть заблокирован, пользователь нажмёт Play */
        });
        onReadyRef.current?.();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Не удалось инициализировать HLS";
        onErrorRef.current?.(message);
      }
    };

    void setup();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className={`w-full h-full block bg-black ${className ?? ""}`}
      playsInline
      controls
      muted
    />
  );
}
