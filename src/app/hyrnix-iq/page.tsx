"use client";

import { useEffect, useRef, useState } from "react";
import { useActingUser } from "@/components/ActingUserContext";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const SUGGESTIONS = [
  "Why was Ava's leave request rejected?",
  "What would happen if I increased Standard Annual Leave's annual leave from 18 to 24?",
  "What is the weather today?",
];

export default function HyrnixIqPage() {
  const { actingUserId } = useActingUser();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text:
        "I'm HYRNIX IQ. I answer questions using the same real data Policy Lab and Process X-Ray use — no guessing. Ask me why a leave request was approved/rejected, or what a policy change would do.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ask(question: string) {
    if (!question.trim()) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    const res = await fetch("/api/hyrnix-iq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, askedById: actingUserId }),
    });
    const data = await res.json();
    setBusy(false);
    const text = res.ok ? data.answer.message : data.error ?? "Something went wrong.";
    setMessages((m) => [...m, { role: "assistant", text }]);
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">HYRNIX IQ</h1>
        <p className="mt-1 text-slate-600">
          Deterministic, rule-based assistant — pattern-matches your question to a real backend lookup. No external
          AI calls.
        </p>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xl whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && <div className="text-xs text-slate-400">thinking…</div>}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Ask HYRNIX IQ a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Send
        </button>
      </form>
    </div>
  );
}
