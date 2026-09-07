"use client";

import { useEffect, useState } from "react";

import { backend } from "@/lib/backend";
import { referralLink } from "@/lib/referral";

export type Profile = {
  id: string;
  name: string;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_place_id: number | null;
  birth_lat: number | null;
  birth_lon: number | null;
  birth_tz: string | null;
  referral_code: string | null;
};

export const cardStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: "20px",
  padding: "28px",
} as const;

export const capStyle = {
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} as const;

export type Birth = { day: number; month: number; year: number } | null;

/**
 * Имя-заглушка: «Я» и «Мой профиль» ставятся системой, пока человек не
 * назвался. В карточке владельца вместо них — «Вы» и предложение ввести имя.
 */
export function isPlaceholderName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  return n === "" || n === "Я" || n === "Мой профиль";
}

/** Как подписать человека: имя, если известно, иначе «Вы» для владельца. */
export function displayName(p: { name: string; relation: string }): string {
  if (!isPlaceholderName(p.name)) return p.name;
  return p.relation === "self" ? "Вы" : p.name;
}

export function parseDate(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { day: d, month: m, year: y };
}

export function InviteBlock({ code, userId }: { code: string | null; userId: string }) {
  const [invited, setInvited] = useState(0);
  const [copied, setCopied] = useState(false);
  const link = code ? referralLink(code) : "";

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    backend.profiles.myReferralCount(userId).then((n) => {
      if (alive) setInvited(n);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* буфер недоступен */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="mt-6"
      style={{
        background: "var(--surface-1)",
        border: "1px solid color-mix(in srgb, var(--text-accent) 40%, transparent)",
        borderRadius: "20px",
        padding: "clamp(24px, 2.4vw, 36px)",
      }}
    >
      <div className="font-display text-text-primary" style={{ fontSize: "clamp(20px, 1.6vw, 27px)" }}>
        Пригласить друга
      </div>
      <p
        className="text-text-secondary"
        style={{ fontSize: "clamp(14px, 1.1vw, 17px)", marginTop: 10, maxWidth: 620 }}
      >
        Друг регистрируется по твоей ссылке — вы оба получаете семь дней полного доступа.
        Считается после того, как он заполнит дату рождения
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center" style={{ marginTop: 20 }}>
        <input
          readOnly
          value={link}
          aria-label="Ссылка-приглашение"
          className="min-w-0 flex-1 text-text-primary"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(13px, 1.05vw, 15px)",
            background: "var(--bg-page)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "14px",
          }}
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-[50px] shrink-0 items-center justify-center px-6 text-[16px] text-text-accent transition-opacity hover:opacity-80"
          style={{
            background: "transparent",
            border: "1px solid color-mix(in srgb, var(--text-accent) 50%, transparent)",
            borderRadius: "12px",
          }}
        >
          {copied ? "Скопировано" : "Скопировать"}
        </button>
      </div>

      <p className="text-text-secondary" style={{ fontSize: 13, marginTop: 16 }}>
        Приглашено: {invited}
      </p>
    </div>
  );
}
