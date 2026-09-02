"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { backend } from "@/lib/backend";

const fieldCls =
  "w-full bg-surface-1 border text-text-primary placeholder:text-text-secondary px-4 outline-none focus-visible:border-text-accent";
const fieldStyle = { height: "52px", borderRadius: "12px", borderColor: "var(--border)" } as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoverNote, setRecoverNote] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: signInError } = await backend.auth.signIn({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (signInError) {
      const msg = (signInError.message || "").toLowerCase();
      if (msg.includes("credentials") || msg.includes("invalid") || msg.includes("confirm")) {
        setError("Неверная почта или пароль");
      } else {
        setError("Что-то пошло не так. Попробуй ещё раз");
      }
      return;
    }

    router.push("/cabinet");
  }

  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative h-[110px] w-full">
        <Header />
      </div>

      <div
        className="mx-auto w-full max-w-[420px] px-[clamp(24px,5vw,40px)]"
        style={{
          paddingTop: "clamp(100px, 14vh, 180px)",
          paddingBottom: "clamp(100px, 14vh, 180px)",
        }}
      >
        <h1
          className="font-display text-text-primary"
          style={{ fontSize: "clamp(30px, 3vw, 46px)", lineHeight: 1.08 }}
        >
          Вход
        </h1>
        <p className="mt-[10px] text-[15px] text-text-secondary">
          Профиль хранит твои расчёты и дневник
        </p>

        <form onSubmit={onSubmit} noValidate>
          <div className="mt-8">
            <input
              type="email"
              placeholder="Почта"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldCls}
              style={fieldStyle}
            />
          </div>
          <div className="mt-3">
            <input
              type="password"
              placeholder="Пароль"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldCls}
              style={fieldStyle}
            />
          </div>

          {error && (
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-danger)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full text-[15px] text-primary-foreground transition-opacity disabled:opacity-40"
            style={{ height: "52px", borderRadius: "12px", background: "var(--accent)" }}
          >
            Войти
          </button>
        </form>

        <div className="mt-[18px] flex flex-col items-center gap-2">
          <Link href="/register" className="text-text-accent text-[15px] hover:underline">
            Создать профиль
          </Link>
          <button
            type="button"
            onClick={() => setRecoverNote(true)}
            className="text-[13px] text-text-secondary hover:underline"
          >
            Забыл пароль
          </button>
          {recoverNote && (
            <p className="text-[13px] text-text-secondary opacity-70">
              Восстановление пароля появится позже
            </p>
          )}
        </div>

        <Link href="/" className="mt-8 inline-block text-text-accent hover:underline">
          ← На главную
        </Link>
      </div>

      <Footer />
    </main>
  );
}
