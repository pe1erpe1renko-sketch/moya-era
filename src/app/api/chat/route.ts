import { NextResponse } from "next/server";
import { calculateMatrix } from "@/lib/matrix";
import { buildRequest, MENTOR_HINTS } from "@/lib/matrix/prompts";
import { LLM_ENABLED, MODEL_CHAT, stream } from "@/server/llm";
import { supabaseService } from "@/server/supabase";
import { loadAccess } from "@/server/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/chat
 * { threadId?: string, personId?: string, message: string }
 *
 * Единственное место, где нейросеть вызывается без кэша — поэтому здесь
 * списывается кредит. Порядок строгий: проверить доступ → списать кредит →
 * сгенерировать → сохранить оба сообщения. Ответ идёт потоком.
 *
 * Персональные данные: дата рождения в контекст наставника НЕ передаётся —
 * только имя и уже посчитанные числа (механика, раздел 14).
 */

const MAX_HISTORY = 16;
const MAX_MESSAGE = 1500;

type Body = { threadId?: string; personId?: string | null; message?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const message = String(body.message ?? "").trim().slice(0, MAX_MESSAGE);
  if (!message) return NextResponse.json({ error: "empty" }, { status: 400 });

  const access = await loadAccess();
  if (!access.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  /* ── демо без базы ── */
  if (access.demo) {
    const reply = LLM_ENABLED
      ? await demoReply(message)
      : "Наставник появится, когда будет подключён ключ нейросети (LLM_API_KEY). Пока попробуйте один из вопросов ниже — они покажут, как устроен разговор.";
    return new Response(reply, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Credits-Left": "∞" } });
  }

  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "server not configured" }, { status: 500 });
  const userId = access.userId;

  /* ── о ком говорим ── */
  let person: { id: string; name: string; birth_date: string; sex: "м" | "ж" | null } | null = null;
  if (body.personId) {
    person = access.people.find((p) => p.id === body.personId) ?? null;
  }
  if (!person) person = access.people.find((p) => p.relation === "self") ?? access.people[0] ?? null;

  /* ── тред ── */
  let threadId = body.threadId ?? null;
  if (threadId) {
    const { data } = await sb.from("chat_threads").select("id").eq("id", threadId).eq("user_id", userId).maybeSingle();
    if (!data) threadId = null;
  }
  if (!threadId) {
    const { data, error } = await sb
      .from("chat_threads")
      .insert({ user_id: userId, person_id: person?.id ?? null, title: message.slice(0, 60) })
      .select("id")
      .single();
    if (error || !data) return NextResponse.json({ error: "thread" }, { status: 500 });
    threadId = data.id as string;
  }

  /* ── история ── */
  const { data: historyRows } = await sb
    .from("chat_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);
  const history = ((historyRows as Array<{ role: "user" | "assistant"; content: string }> | null) ?? []).reverse();

  /* ── кредит ── */
  const { data: left, error: spendErr } = await sb.rpc("spend_credit", { _user: userId, _reason: "chat_message", _ref: threadId });
  if (spendErr) return NextResponse.json({ error: "credits" }, { status: 500 });
  if (Number(left) < 0) {
    return NextResponse.json({ error: "no_credits", threadId }, { status: 402 });
  }

  /* ── сохраняем вопрос ── */
  await sb.from("chat_messages").insert({ thread_id: threadId, user_id: userId, role: "user", content: message });

  if (!LLM_ENABLED) {
    const text = "Нейросеть пока не подключена. Кредит возвращён.";
    await sb.from("credits_ledger").insert({ user_id: userId, delta: 1, reason: "refund", ref: threadId });
    await sb.from("chat_messages").insert({ thread_id: threadId, user_id: userId, role: "assistant", content: text });
    return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Thread-Id": threadId, "X-Credits-Left": String(Number(left) + 1) } });
  }

  /* ── контекст ── */
  const matrix = person ? calculateMatrix(person.birth_date) : null;
  const built = buildRequest({
    kind: "mentor",
    matrix: matrix ? { ...matrix, birthDate: "" } : (calculateMatrix("1990-01-01") as never),
    person: person ? { name: person.name, sex: person.sex ?? undefined } : null,
    plan: access.plan ? { label: access.plan.title } : { label: "без подписки" },
    messages: [...history, { role: "user", content: message }],
  });

  const encoder = new TextEncoder();
  let full = "";
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const gen = stream({ model: MODEL_CHAT, system: built.system, messages: built.messages ?? [], maxTokens: built.maxTokens, temperature: built.temperature });
        for (;;) {
          const { value, done } = await gen.next();
          if (done) {
            full = value.text || full;
            break;
          }
          full += value;
          controller.enqueue(encoder.encode(value));
        }
      } catch (e) {
        const msg = "\n\nНе удалось получить ответ. Кредит возвращён — попробуйте ещё раз.";
        controller.enqueue(encoder.encode(msg));
        await sb.from("credits_ledger").insert({ user_id: userId, delta: 1, reason: "refund", ref: threadId });
        full = full || String(e instanceof Error ? e.message : e);
      } finally {
        if (full.trim()) {
          await sb.from("chat_messages").insert({ thread_id: threadId, user_id: userId, role: "assistant", content: full.trim(), model: MODEL_CHAT });
          await sb.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
        }
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Thread-Id": threadId,
      "X-Credits-Left": String(left),
    },
  });
}

/** Демо-ответ без базы: полноценный вызов модели, но без истории и списаний. */
async function demoReply(message: string): Promise<string> {
  const matrix = calculateMatrix("1998-07-13");
  const req = buildRequest({
    kind: "mentor",
    matrix: { ...matrix, birthDate: "" },
    person: { name: "Гость" },
    plan: { label: "демо" },
    messages: [{ role: "user", content: message }],
  });
  let out = "";
  const gen = stream({ model: MODEL_CHAT, system: req.system, messages: req.messages ?? [], maxTokens: req.maxTokens, temperature: req.temperature });
  for (;;) {
    const { value, done } = await gen.next();
    if (done) return value.text || out;
    out += value;
  }
}

export async function GET() {
  return NextResponse.json({ hints: MENTOR_HINTS, enabled: LLM_ENABLED });
}
