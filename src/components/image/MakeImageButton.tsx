"use client";

import { useState } from "react";
import { ImageDialog } from "./ImageDialog";
import type { ImageThemeId } from "@/lib/image";

/**
 * Кнопка «Сделать образ» — обычная кнопка рядом с результатом, без
 * зазывания. Окно собирается только по нажатию: рисовать карточку
 * заранее незачем, а иллюстрация в оригинале весит триста килобайт.
 */
export function MakeImageButton({
  birthIso,
  name = null,
  theme = "core",
  label = "Сделать образ",
  className = "qc-focus inline-flex items-center rounded-[12px] border border-text-accent/50 px-5 text-[15px] text-text-primary transition-colors hover:bg-accent/10",
  style = { height: 46 },
}: {
  birthIso: string;
  name?: string | null;
  theme?: ImageThemeId;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} style={style}>
        {label}
      </button>
      {/* Окно монтируется только на время показа: тогда выбранная тема
          и предпросмотр начинаются с чистого листа каждый раз, и их не
          нужно сбрасывать вручную. */}
      {open && (
        <ImageDialog open onClose={() => setOpen(false)} birthIso={birthIso} name={name} theme={theme} />
      )}
    </>
  );
}
