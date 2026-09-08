"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { useAuth } from "@/lib/useAuth";
import { creditWord } from "@/lib/plansDefault";
import { backend, RELATION_LABELS, type ChatThread, type Person } from "@/lib/backend";
import { DEMO_MODE } from "@/lib/env";
import { MENTOR_HINTS } from "@/lib/matrix/prompts";
import { track } from "@/components/analytics/track";
import { askPath } from "@/lib/tarot/ask";
import { leaveForAuth } from "@/lib/returnTo";

type Msg = { id: string; role: "user" | "assistant"; content: string; pending?: boolean };

/**
 * ЧАТ С НАСТАВНИКОМ.
 * Один кредит — одно сообщение. Ответ приходит потоком.
 * Контекст — числа выбранного человека; дата рождения на сервер чата не уходит.
 */
export default function MentorPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Гостя уводим на вход с возвратом сюда же: он шёл к наставнику, а не в кабинет.
  useEffect(() => {
    if (!loading && !isAuthenticated) leaveForAuth(router, "login", "/nastavnik", "replace");
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([backend.people.list(user.id), backend.chat.threads(user.id), backend.billing.creditBalance(user.id)]).then(([ppl, th, bal]) => {
      const list = ppl.data ?? [];
      setPeople(list);
      setPersonId(list.find((p) => p.relation === "self")?.id ?? list[0]?.id ?? null);
      setThreads(th);
      setCredits(bal);
    });
  }, [user]);

  const openThread = useCallback(async (t: ChatThread) => {
    setThreadId(t.id);
    if (t.person_id) setPersonId(t.person_id);
    const rows = await backend.chat.messages(t.id);
    setMessages(rows.map((r) => ({ id: r.id, role: r.role, content: r.content })));
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setError(null);
    setBusy(true);
    setInput("");
    const userMsg: Msg = { id: `u${Date.now()}`, role: "user", content: msg };
    const botMsg: Msg = { id: `a${Date.now()}`, role: "assistant", content: "", pending: true };
    setMessages((m) => [...m, userMsg, botMsg]);
    track("chat_message");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, personId, message: msg }),
      });
      if (res.status === 402) {
        setMessages((m) => m.filter((x) => x.id !== botMsg.id));
        setError("Кредиты закончились. Докупить можно на странице тарифов.");
        setCredits(0);
        return;
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const tid = res.headers.get("X-Thread-Id");
      if (tid && tid !== threadId) setThreadId(tid);
      // В демо заголовка нет вовсе — остаток не меняется.
      const left = res.headers.get("X-Credits-Left");
      if (left !== null && /^\d+$/.test(left)) setCredits(Number(left));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === botMsg.id ? { ...x, content: acc } : x)));
      }
      setMessages((m) => m.map((x) => (x.id === botMsg.id ? { ...x, content: acc, pending: false } : x)));
      if (user && !DEMO_MODE) backend.chat.threads(user.id).then(setThreads);
    } catch {
      setMessages((m) => m.filter((x) => x.id !== botMsg.id));
      setError("Не удалось отправить. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  const person = people.find((p) => p.id === personId) ?? null;
  // Последний завершённый ответ наставника — под ним предложение расклада.
  const lastAnswer = messages.reduce((found, m, i) => (m.role === "assistant" && !m.pending && m.content ? i : found), -1);

  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative w-full" style={{ height: "var(--header-h)" }}>
        <Header />
      </div>

      <div className="mx-auto w-[min(1100px,92vw)] pb-16 pt-6 md:pt-10">
        {/* Путь назад над чатом: из разговора должно быть видно, куда
            вернуться, а не только пункт в шапке. */}
        <Link href="/cabinet" className="inline-flex items-center py-2 text-[14px] text-text-secondary transition-colors hover:text-text-primary">
          ← В кабинет
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(30px, 3vw, 48px)", lineHeight: 1.08 }}>Наставник</h1>
            <p className="mt-2 max-w-[640px] text-[15px] text-text-secondary">Видит ваши числа и отвечает на вопрос, а не на аркан. Не врач, не психолог и не юрист — и скажет об этом прямо.</p>
          </div>
          <div className="text-[14px] text-text-secondary">
            {credits === null ? "" : DEMO_MODE ? "демо · без списаний" : `${credits} ${creditWord(credits)}`}{" "}
            <Link href="/tarify#credits" className="ml-2 text-text-accent underline-offset-4 hover:underline">докупить</Link>
          </div>
        </div>

        {/* min-w-0 на обеих колонках: без него выпадающий список «О ком
            говорим» со своей минимальной шириной распирал страницу на
            телефоне на 31px за край экрана. */}
        <div className="mt-6 grid gap-4 md:grid-cols-[240px_1fr]">
          {/* Слева: о ком и история */}
          <aside className="min-w-0 space-y-4">
            <div className="rounded-[16px] border border-border/60 bg-surface-1/40 p-4">
              <div className="text-[12px] uppercase tracking-[0.08em] text-text-secondary">О ком говорим</div>
              <select value={personId ?? ""} onChange={(e) => { setPersonId(e.target.value || null); setThreadId(null); setMessages([]); }} className="qc-focus mt-2 h-11 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-3 text-[15px] text-text-primary">
                {people.length === 0 && <option value="">Сначала добавьте дату в кабинете</option>}
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {RELATION_LABELS[p.relation]}</option>
                ))}
              </select>
              <button type="button" onClick={() => { setThreadId(null); setMessages([]); }} className="mt-3 text-[14px] text-text-accent underline-offset-4 hover:underline">
                Новый разговор
              </button>
            </div>
            {threads.length > 0 && (
              <div className="rounded-[16px] border border-border/60 bg-surface-1/40 p-4">
                <div className="text-[12px] uppercase tracking-[0.08em] text-text-secondary">Прошлые разговоры</div>
                <ul className="mt-2 space-y-1">
                  {threads.slice(0, 10).map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => openThread(t)} className={`w-full truncate rounded-[8px] px-2 py-1.5 text-left text-[14px] ${t.id === threadId ? "bg-accent/20 text-text-primary" : "text-text-secondary hover:text-text-primary"}`}>
                        {t.title ?? "Разговор"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          {/* Чат */}
          <section className="flex min-h-[520px] min-w-0 flex-col rounded-[20px] border border-border/60 bg-surface-1/30">
            <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6" style={{ maxHeight: "60vh" }}>
              {messages.length === 0 && (
                <div>
                  <p className="text-[15px] text-text-secondary">
                    {person ? `Разговор про ${person.name === "Я" ? "вас" : person.name}. ` : ""}С чего начать:
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {MENTOR_HINTS.map((h) => (
                      <button key={h} type="button" onClick={() => send(h)} className="rounded-full border border-border px-4 py-2 text-left text-[14px] text-text-secondary transition-colors hover:border-text-accent/60 hover:text-text-primary">
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => {
                // Под последним готовым ответом — ненавязчивое предложение
                // разложить карты на тот же вопрос: он уедет на /taro уже
                // вписанным в поле.
                const asked = i === lastAnswer ? messages.slice(0, i).reverse().find((x) => x.role === "user")?.content : null;
                return (
                  <div key={m.id}>
                    <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] whitespace-pre-wrap rounded-[16px] px-4 py-3 text-[15px] leading-[1.6] ${m.role === "user" ? "bg-accent/30 text-text-primary" : "bg-bg-page/60 text-text-secondary"}`}>
                        {m.content || (m.pending ? "…" : "")}
                      </div>
                    </div>
                    {asked && (
                      <p className="mt-1.5 pl-1 text-[13px] text-text-secondary">
                        <Link href={askPath({ q: asked })} className="text-text-accent underline-offset-4 hover:underline">
                          На этот вопрос можно сделать расклад →
                        </Link>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {error && <p className="px-4 pb-2 text-[14px] text-text-danger md:px-6">{error}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2 border-t border-border/40 p-3 md:p-4"
            >
              {/* min-w-0 у поля: у <input> есть своя минимальная ширина, и
                  без него поле с кнопкой не помещались в 390 точек — страница
                  уезжала вправо на 17px. */}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ваш вопрос…"
                maxLength={1500}
                disabled={busy}
                className="qc-focus h-12 min-w-0 flex-1 rounded-[12px] border border-border bg-surface-1 px-4 text-[16px] text-text-primary focus:border-text-accent"
              />
              <button type="submit" disabled={busy || !input.trim()} className="h-12 rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground disabled:opacity-40">
                {busy ? "…" : "Отправить"}
              </button>
            </form>
          </section>
        </div>

        <p className="mt-4 text-[13px] text-text-secondary/80">
          Если вам сейчас тяжело — наставник перестанет говорить про арканы и поможет найти живого человека. Разговор не заменяет помощь специалиста.
        </p>
      </div>

      <Footer />
    </main>
  );
}
