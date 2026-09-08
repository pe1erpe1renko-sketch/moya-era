"use client";

import { useState } from "react";
import { backend } from "@/lib/backend";
import { useAuth } from "@/lib/useAuth";
import { isCountableName } from "@/lib/numerology";

/**
 * Добавление имени прямо в блоке результата.
 *
 * Число судьбы считается по имени, а не по дате, — значит без имени его
 * просто нет, и это надо сказать честно, а не прятать за замок. Человек
 * дописывает имя здесь же, разбор пересчитывается на месте, дату заново
 * не спрашиваем.
 *
 * Имя в адрес страницы не кладём: кириллица в ссылке нечитаема, а чужое
 * имя в общедоступном адресе — персональные данные. Оно живёт в параметре
 * запроса, и такая страница закрыта от индексации.
 */

export function AddName({
  name,
  onApply,
}: {
  name: string | null;
  onApply: (next: string | null) => void;
}) {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name ?? "");
  const [applied, setApplied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const usable = isCountableName(value);

  function apply() {
    if (!usable) return;
    onApply(value.trim());
    setApplied(true);
    setSaved(false);
    setSaveError(null);
  }

  async function saveToProfile() {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    const { data: profile, error } = await backend.profiles.getOwner(user.id);
    if (error || !profile) {
      setSaving(false);
      setSaveError("Не удалось открыть профиль. Попробуйте ещё раз");
      return;
    }
    const { error: updateError } = await backend.profiles.update(profile.id, { name: value.trim() });
    setSaving(false);
    if (updateError) {
      setSaveError("Не удалось сохранить. Попробуйте ещё раз");
      return;
    }
    setSaved(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="qc-focus mt-4 inline-flex items-center rounded-[12px] border border-text-accent/50 px-5 text-[15px] text-text-primary transition-colors hover:bg-accent/10"
        style={{ height: 46 }}
      >
        {name ? "Изменить имя" : "Добавить имя"}
      </button>
    );
  }

  return (
    <div className="mt-4 w-full max-w-full rounded-[16px] border border-border bg-surface-1" style={{ padding: "16px 18px" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-text-primary" style={{ fontSize: 15 }}>
          Полное имя для числа судьбы
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-text-secondary hover:text-text-primary"
          style={{ fontSize: 14 }}
        >
          Свернуть
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center" style={{ gap: 10 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="Например: Пётр Иванович Петров"
          aria-label="Полное имя для числа судьбы"
          className="qc-focus h-12 min-w-0 flex-1 rounded-[12px] border border-border bg-surface-1 px-3 text-[16px] text-text-primary transition-colors placeholder:text-text-secondary focus:border-text-accent"
          style={{ minWidth: 220 }}
        />
        <button
          type="button"
          onClick={apply}
          disabled={!usable}
          className="qc-focus inline-flex items-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground transition-opacity"
          style={{ height: 48, opacity: usable ? 1 : 0.4 }}
        >
          Посчитать
        </button>
      </div>

      <p className="mt-2 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
        Имя остаётся в адресе этой вкладки и на сервер не отправляется: в статистику адрес уходит без имени, страница с именем закрыта от поисковиков
      </p>

      {applied && isAuthenticated && !saved && (
        <div className="mt-3">
          <button
            type="button"
            onClick={saveToProfile}
            disabled={saving}
            className="qc-focus inline-flex items-center rounded-[12px] border border-text-accent/50 px-5 text-[15px] text-text-primary transition-colors hover:bg-accent/10"
            style={{ height: 44 }}
          >
            {saving ? "Сохраняю…" : "Сохранить имя в профиль"}
          </button>
          <p className="mt-2 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
            Тогда мы будем обращаться по имени и не спросим его снова
          </p>
        </div>
      )}

      {saved && (
        <p className="mt-3 text-text-accent" style={{ fontSize: 14 }}>
          Сохранено в профиль
        </p>
      )}
      {saveError && <p className="mt-2 text-[13px] text-text-danger">{saveError}</p>}
    </div>
  );
}
