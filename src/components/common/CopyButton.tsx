"use client";

import { useEffect, useRef, useState } from "react";

/**
 * КНОПКА «СКОПИРОВАТЬ» С ОТВЕТОМ «СКОПИРОВАНО».
 *
 * Одна на весь сайт: ID клиента в кабинете и на странице поддержки,
 * почта поддержки. Ответ держится полторы секунды и уходит сам — этого
 * хватает, чтобы заметить, и не надо ничего закрывать.
 */
export function CopyButton({
  text,
  label = "Скопировать",
  className = "",
  compact = false,
}: {
  /** что положить в буфер */
  text: string;
  label?: string;
  className?: string;
  /** только значок, без подписи — для строки в шапке кабинета */
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Буфер недоступен (старый браузер, запрет): отбираем текст, чтобы
      // его можно было скопировать руками.
      const range = document.createRange();
      const node = document.querySelector(`[data-copy-text="${CSS.escape(text)}"]`);
      if (node) {
        range.selectNodeContents(node);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Скопировано" : `${label}: ${text}`}
      title={copied ? "Скопировано" : label}
      className={`qc-focus inline-flex items-center gap-1.5 transition-colors ${copied ? "text-text-accent" : "text-text-secondary hover:text-text-primary"} ${className}`}
    >
      {copied ? (
        <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10.5l4 4 8-9" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="7" width="9" height="9" rx="2" />
          <path d="M4 13V5a1 1 0 0 1 1-1h8" />
        </svg>
      )}
      {(!compact || copied) && <span style={{ fontSize: 13 }}>{copied ? "Скопировано" : label}</span>}
    </button>
  );
}
