"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useHLSVideo } from "@/hooks/use-hls-video";

interface Stream {
  id: string;
  thumbnail?: string;
  user?: { id: string; email: string } | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

export default function CategoryPage() {
  const params = useParams();
  const categoryId = params.id as string;
  
  const [category, setCategory] = useState<Category | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!categoryId) return;
    
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      // Получаем все категории и ищем нашу
      const catRes = await fetch("/api/categories");
      if (!catRes.ok) throw new Error("Failed");
      const catData = await catRes.json();
      const cat = catData.categories?.find((c: any) => c.id === categoryId);
      if (!cat) {
        setError("Категория не найдена");
        return;
      }
      setCategory(cat);

      // Получаем все стримы
      const streamsRes = await fetch("/api/streams");
      if (!streamsRes.ok) throw new Error("Failed");
      const streamsData = await streamsRes.json();
      
      // Фильтруем стримы по категории
      const filtered = (streamsData.streams || []).filter(
        (s: any) => s.categoryId === categoryId
      );

      // Загружаем превью для каждого стрима
      const withThumbnails = await Promise.all(
        filtered.map(async (stream: any) => {
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

      setStreams(withThumbnails);
    } catch (err) {
      setError("Ошибка при загрузке");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">Загружаем...</p>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="border-b border-white/10 py-6 px-10">
          <Link
            href="/"
            className="text-sm border border-white/20 rounded-full px-4 py-2 hover:bg-white/10 transition inline-block"
          >
            На главную
          </Link>
        </header>
        <div className="flex items-center justify-center h-96">
          <p className="text-red-400">{error || "Категория не найдена"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 py-6 px-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold">{category.name}</h1>
            {category.description && (
              <p className="text-zinc-400 mt-2">{category.description}</p>
            )}
          </div>
          <Link
            href="/"
            className="text-sm border border-white/20 rounded-full px-4 py-2 hover:bg-white/10 transition"
          >
            На главную
          </Link>
        </div>
      </header>

      <div className="px-10 py-12 max-w-6xl mx-auto">
        {streams.length === 0 ? (
          <p className="text-zinc-500">В этой категории пока нет стримов</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {streams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StreamCardProps {
  stream: Stream;
}

function StreamCard({ stream }: StreamCardProps) {
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
        <h4 className="font-semibold text-xl truncate">{stream.user?.email || "Unknown"}</h4>
        <span className="text-green-400 text-sm font-medium">● Live</span>
      </div>
    </Link>
  );
}
