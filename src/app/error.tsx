"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl text-text-primary">Страница не загрузилась</h1>
        <p className="mt-2 text-sm text-text-secondary">Что-то пошло не так. Попробуй обновить или вернуться на главную.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-[10px] bg-accent px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-[10px] border border-border px-5 py-2.5 text-sm text-text-primary"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
