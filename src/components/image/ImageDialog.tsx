"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDateLong } from "@/lib/matrix";
import {
  buildAllImageData,
  CHOICE_LABELS,
  DATE_WARNING,
  readChoices,
  writeChoices,
  type ImageChoices,
  type ImageData,
  type ImageThemeId,
} from "@/lib/image";
import { downloadCard, renderCard } from "@/lib/image/render";
import { isoToChartUrlDate } from "@/lib/chartUrl";

/**
 * ОКНО «СДЕЛАТЬ ОБРАЗ».
 *
 * Слева семь тем, справа предпросмотр и галочки. Карточка рисуется
 * настоящая, та же самая, что уйдёт в файл, — предпросмотр не подделка,
 * а уменьшенный canvas. Иначе легко было бы показать одно, а скачать
 * другое.
 *
 * Имя берётся из профиля или из уточнения на странице и на сервер не
 * уходит вместе с датой: это решение принято раньше и здесь не
 * пересматривается.
 */

export function ImageDialog({
  open,
  onClose,
  birthIso,
  name,
  theme: initialTheme = "core",
}: {
  open: boolean;
  onClose: () => void;
  birthIso: string;
  /** имя, если известно; без него галочка «Имя» не показывается */
  name: string | null;
  theme?: ImageThemeId;
}) {
  const [theme, setTheme] = useState<ImageThemeId>(initialTheme);
  const [choices, setChoices] = useState<ImageChoices>(() => readChoices());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const all = useMemo(() => buildAllImageData(birthIso), [birthIso]);
  const data: ImageData | undefined = all.find((d) => d.theme === theme) ?? all[0];

  const fields = useMemo(
    () =>
      data
        ? {
            label: data.label,
            name: choices.name && name ? name : null,
            title: choices.title ? `${data.arcanum} · ${data.title}` : null,
            line: choices.line ? data.line : null,
            date: choices.date ? formatDateLong(birthIso) : null,
          }
        : null,
    [data, choices, name, birthIso],
  );

  useEffect(() => {
    writeChoices(choices);
  }, [choices]);

  // Предпросмотр — та же карточка, что уйдёт в файл.
  useEffect(() => {
    if (!open || !fields || !data) return;
    let alive = true;
    renderCard(fields, data.arcanum)
      .then((canvas) => {
        if (!alive) return;
        canvasRef.current = canvas;
        setError(null);
        setPreview(canvas.toDataURL("image/jpeg", 0.7));
      })
      .catch((e: Error) => {
        if (!alive) return;
        canvasRef.current = null;
        setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [open, fields, data]);

  const save = useCallback(async () => {
    if (!canvasRef.current || !data) return;
    setBusy(true);
    try {
      await downloadCard(canvasRef.current, `moyaera-${data.theme}-${isoToChartUrlDate(birthIso)}.jpg`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [data, birthIso]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !data || !fields) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Сделать образ"
        className="my-auto w-full max-w-[900px] rounded-[20px] border border-border bg-bg-page"
        style={{ padding: "20px 20px 24px" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(22px, 2vw, 30px)", lineHeight: 1.1 }}>
              Сделать образ
            </h2>
            <p className="mt-1 text-text-secondary" style={{ fontSize: 14 }}>
              Карточка 1080×1920 — под экран телефона: годится и в сторис, и как обои
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="qc-focus flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-accent/10 hover:text-text-primary"
            style={{ fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <div className="order-2 flex justify-center md:order-1">
            {preview ? (
              <img
                src={preview}
                alt={`Образ: ${data.label}, аркан ${data.arcanum}, ${data.title}`}
                className="rounded-[12px] border border-border"
                style={{ width: 240, height: 427 }}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-[12px] border border-border bg-surface-1 text-text-secondary"
                style={{ width: 240, height: 427, fontSize: 14 }}
              >
                {error ? "Не собралось" : "Собираем карточку…"}
              </div>
            )}
          </div>

          <div className="order-1 md:order-2">
            <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              О чём карточка
            </div>
            <div className="mt-3 flex flex-wrap" style={{ gap: 8 }}>
              {all.map((d) => (
                <button
                  key={d.theme}
                  type="button"
                  onClick={() => setTheme(d.theme)}
                  aria-pressed={d.theme === theme}
                  className={`qc-focus rounded-[10px] border px-3 text-[14px] transition-colors ${
                    d.theme === theme
                      ? "border-text-accent bg-accent/15 text-text-primary"
                      : "border-border text-text-secondary hover:border-text-accent/60"
                  }`}
                  style={{ height: 38 }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="mt-6 text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Что показать
            </div>
            <div className="mt-3 flex flex-col" style={{ gap: 10 }}>
              {CHOICE_LABELS.filter((c) => c.key !== "name" || name).map((c) => (
                <label key={c.key} className="flex cursor-pointer items-start gap-3 text-text-primary" style={{ fontSize: 15 }}>
                  <input
                    type="checkbox"
                    checked={choices[c.key]}
                    onChange={(e) => setChoices((s) => ({ ...s, [c.key]: e.target.checked }))}
                    className="qc-focus mt-0.5 h-[18px] w-[18px] flex-shrink-0 accent-[var(--accent)]"
                  />
                  <span>
                    {c.label}
                    {c.key === "date" && (
                      <span className="mt-1 block text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
                        {DATE_WARNING}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            {error && <p className="mt-4 text-[14px] text-text-danger">{error}</p>}

            <div className="mt-6 flex flex-wrap items-center" style={{ gap: 12 }}>
              <button
                type="button"
                onClick={save}
                disabled={busy || !preview}
                className="qc-focus inline-flex items-center rounded-[12px] bg-accent px-6 text-[16px] font-medium text-primary-foreground transition-opacity"
                style={{ height: 50, opacity: busy || !preview ? 0.4 : 1 }}
              >
                {busy ? "Сохраняем…" : "Скачать картинку"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
