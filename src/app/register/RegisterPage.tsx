"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { backend } from "@/lib/backend";
import { ensureOwnerProfile } from "@/lib/profile";
import {
  formatPendingBirth,
  readPendingBirth,
  setProfileSaveError,
  type PendingBirth,
} from "@/lib/pendingBirth";
import { savePendingRef } from "@/lib/referral";

const fieldCls =
  "w-full bg-surface-1 border text-text-primary placeholder:text-text-secondary px-4 outline-none focus-visible:border-text-accent";
const fieldStyle = { height: "52px", borderRadius: "12px", borderColor: "var(--border)" } as const;

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingBirth | null>(null);

  useEffect(() => {
    setPending(readPendingBirth());
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) savePendingRef(ref);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);

    let invalid = false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Проверь адрес почты");
      invalid = true;
    }
    if (password.length < 8) {
      setPasswordError("Пароль должен быть не короче 8 символов");
      invalid = true;
    }
    if (invalid) return;

    setBusy(true);
    const { data, error } = await backend.auth.signUp({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        setEmailError("Такая почта уже зарегистрирована");
      } else if (msg.includes("email") && msg.includes("invalid")) {
        setEmailError("Проверь адрес почты");
      } else if (msg.includes("password")) {
        setPasswordError("Пароль должен быть не короче 8 символов");
      } else {
        setFormError("Что-то пошло не так. Попробуй ещё раз");
      }
      return;
    }

    const userId = data?.user?.id;
    if (userId) {
      const ok = await ensureOwnerProfile(userId, pending);
      if (!ok) setProfileSaveError();
    } else {
      setProfileSaveError();
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
          Создать профиль
        </h1>
        <p className="mt-[10px] text-[15px] text-text-secondary">
          Профиль хранит твои расчёты, дневник и профили близких
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
            {emailError && (
              <p className="mt-2 text-[13px]" style={{ color: "var(--text-danger)" }}>
                {emailError}
              </p>
            )}
          </div>

          <div className="mt-3">
            <input
              type="password"
              placeholder="Пароль"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldCls}
              style={fieldStyle}
            />
            {passwordError && (
              <p className="mt-2 text-[13px]" style={{ color: "var(--text-danger)" }}>
                {passwordError}
              </p>
            )}
          </div>

          <label className="mt-4 flex items-start gap-3 text-[13px] text-text-secondary">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-[2px] h-4 w-4 shrink-0"
              style={{ accentColor: "var(--accent)" }}
            />
            <span>
              Согласен на{" "}
              <Link href="/consent" className="text-text-accent hover:underline">
                обработку персональных данных
              </Link>
            </span>
          </label>

          {pending && (
            <p
              className="mt-4 text-[14px] text-text-secondary"
              style={{
                background: "var(--surface-1)",
                borderRadius: "10px",
                padding: "14px",
              }}
            >
              {formatPendingBirth(pending)}
            </p>
          )}

          <button
            type="submit"
            disabled={!agreed || busy}
            className="mt-5 w-full text-[15px] text-primary-foreground transition-opacity disabled:opacity-40"
            style={{ height: "52px", borderRadius: "12px", background: "var(--accent)" }}
          >
            Создать профиль
          </button>

          {formError && (
            <p className="mt-3 text-[13px]" style={{ color: "var(--text-danger)" }}>
              {formError}
            </p>
          )}
        </form>

        <div className="mt-[18px] text-center">
          <Link href="/login" className="text-text-accent text-[15px] hover:underline">
            Уже есть профиль? Войти
          </Link>
        </div>

        <Link href="/" className="mt-8 inline-block text-text-accent hover:underline">
          ← На главную
        </Link>
      </div>

      <Footer />
    </main>
  );
}
