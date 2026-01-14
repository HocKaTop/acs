import { useEffect, useRef } from "react";

export function useHLSVideo(src: string | null | undefined) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  useEffect(() => {
    if (!src || !videoRef.current) return;

    const loadHLS = async () => {
      // Динамически импортируем hls.js
      const HLS = (await import("hls.js")).default;

      if (HLS.isSupported()) {
        const hls = new HLS({
          debug: false,
          enableWorker: true,
        });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(videoRef.current!);
      } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
        // Для Safari
        videoRef.current.src = src;
      }
    };

    void loadHLS();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src]);

  return videoRef;
}
