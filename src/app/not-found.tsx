import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-text-primary">404</h1>
        <h2 className="mt-4 text-xl text-text-primary">Такой страницы нет</h2>
        <p className="mt-2 text-sm text-text-secondary">Возможно, ссылка устарела или адрес набран с ошибкой.</p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-[10px] bg-accent px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
