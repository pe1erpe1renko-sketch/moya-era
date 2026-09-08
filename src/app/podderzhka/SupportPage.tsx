"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { CopyButton } from "@/components/common/CopyButton";
import { backend } from "@/lib/backend";
import { useAuth } from "@/lib/useAuth";
import { supportChannels, type SupportChannel } from "@/lib/support";

/**
 * СТРАНИЦА ПОДДЕРЖКИ — /podderzhka.
 *
 * Сверху — ID человека с кнопкой копирования и просьба присылать его
 * вместе с вопросом: по ID поддержка находит аккаунт сразу. Гостю ID не
 * показываем — предлагаем войти. Ниже три карточки: Telegram и Max
 * кликабельны целиком, почта — с кнопкой копирования.
 */
export default function SupportPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const channels = supportChannels();

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    backend.profiles
      .getOwner(user.id)
      .then((r) => {
        if (alive) setClientId(r.data?.client_id ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative w-full" style={{ height: "var(--header-h)" }}>
        <Header />
      </div>

      <div className="mx-auto w-[min(960px,92vw)]" style={{ paddingTop: "clamp(20px, 4vh, 48px)", paddingBottom: "clamp(60px, 8vh, 110px)" }}>
        <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(32px, 3.4vw, 52px)", lineHeight: 1.06 }}>
          Поддержка
        </h1>
        <p className="mt-3 max-w-[560px] text-text-secondary" style={{ fontSize: "clamp(15px, 1.15vw, 18px)", lineHeight: 1.6 }}>
          Напишите, где удобнее. Отвечает живой человек, обычно в течение дня
        </p>

        {/* ID — чтобы поддержка нашла аккаунт сразу */}
        <section className="support-id mt-8" aria-label="Ваш ID">
          {loading ? null : isAuthenticated ? (
            <>
              <div className="text-text-secondary" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Ваш ID
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-mono text-text-primary" data-copy-text={clientId ?? ""} style={{ fontSize: "clamp(22px, 2.2vw, 30px)", letterSpacing: "0.04em" }}>
                  {clientId ?? "загружаем"}
                </span>
                {clientId && <CopyButton text={clientId} className="rounded-full border border-border px-3 py-1.5 hover:border-text-accent/60" />}
              </div>
              <p className="mt-3 text-text-secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
                Чтобы мы ответили быстрее, отправьте вместе с вопросом ваш ID
              </p>
            </>
          ) : (
            <>
              <div className="text-text-secondary" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Ваш ID
              </div>
              <p className="mt-2 text-text-primary" style={{ fontSize: 16, lineHeight: 1.6 }}>
                У каждого аккаунта есть ID — с ним поддержка находит вас сразу.{" "}
                <Link href="/login?next=%2Fpodderzhka" className="tap text-text-accent underline-offset-4 hover:underline">
                  Войдите
                </Link>
                , и он появится здесь
              </p>
            </>
          )}
        </section>

        {/* Три способа связи */}
        {channels.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {channels.map((c) => (
              <ChannelCard key={c.id} channel={c} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-[15px] leading-[1.6] text-text-secondary">
            Адреса поддержки появятся здесь, как только будут настроены. Пока сохраните номер обращения выше — по нему мы
            найдём ваш аккаунт.
          </p>
        )}

        <p className="mt-6 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Разборы не заменяют врача, юриста и психолога — но если что-то на сайте работает не так, как обещано, напишите, и мы
          разберёмся
        </p>
      </div>

      <Footer />
    </main>
  );
}

function ChannelCard({ channel }: { channel: SupportChannel }) {
  const inner = (
    <>
      <span className="support-card-icon" aria-hidden="true">
        <Icon id={channel.id} />
      </span>
      <span className="mt-4 block font-display text-text-primary" style={{ fontSize: "clamp(20px, 1.6vw, 24px)", lineHeight: 1.15 }}>
        {channel.title}
      </span>
      <span className="mt-1.5 block truncate text-text-secondary" style={{ fontSize: 14 }} data-copy-text={channel.id === "email" ? channel.value : undefined}>
        {channel.shown}
      </span>
    </>
  );

  if (channel.id === "email") {
    return (
      <div className="support-card">
        {inner}
        <div className="mt-4">
          <CopyButton text={channel.value} label="Скопировать почту" className="rounded-full border border-border px-3 py-1.5 hover:border-text-accent/60" />
        </div>
      </div>
    );
  }

  return (
    <a href={channel.value} target="_blank" rel="noopener noreferrer" className="support-card qc-focus">
      {inner}
      <span className="mt-4 block text-text-accent" style={{ fontSize: 14 }}>
        Открыть чат →
      </span>
    </a>
  );
}

function Icon({ id }: { id: SupportChannel["id"] }) {
  if (id === "email") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M3.5 7l8.5 6 8.5-6" />
      </svg>
    );
  }
  if (id === "max") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 15.5v-7l4 4.5 4-4.5v7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 4L3 11.5l6.5 2L12 20l3-5 6-11z" />
      <path d="M9.5 13.5L21 4" />
    </svg>
  );
}
