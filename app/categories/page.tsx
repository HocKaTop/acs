"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

interface Stream {
  id: string;
  categoryId?: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, streamsRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/streams"),
      ]);

      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories || []);
      }

      if (streamsRes.ok) {
        const data = await streamsRes.json();
        setStreams(data.streams || []);
      }
    } catch (err) {
      setError("Ошибка при загрузке");
    } finally {
      setLoading(false);
    }
  };

  const getStreamCount = (categoryId: string) => {
    return streams.filter((s) => s.categoryId === categoryId).length;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 py-6 px-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold">Категории стримов</h1>
          <Link
            href="/"
            className="text-sm border border-white/20 rounded-full px-4 py-2 hover:bg-white/10 transition"
          >
            На главную
          </Link>
        </div>
      </header>

      <div className="px-10 py-12 max-w-6xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-zinc-400">Загружаем...</p>
        ) : categories.length === 0 ? (
          <p className="text-zinc-500">Нет категорий</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.id}`}
                className="group bg-zinc-900 border border-white/10 rounded-lg p-6 hover:border-white/30 hover:bg-zinc-800 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg group-hover:text-white transition">
                    {cat.name}
                  </h3>
                  <span className="text-xs bg-white/10 rounded-full px-2 py-1 group-hover:bg-white/20 transition">
                    {getStreamCount(cat.id)} {getStreamCount(cat.id) === 1 ? "стрим" : "стримов"}
                  </span>
                </div>
                {cat.description && (
                  <p className="text-sm text-zinc-400 mb-4">{cat.description}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs text-zinc-500">Перейти →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
