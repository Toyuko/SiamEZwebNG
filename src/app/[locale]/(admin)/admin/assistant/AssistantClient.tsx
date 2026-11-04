"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";

type LinkItem = { href: string; label: string };
type Pending = { id: string; summary: string };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: LinkItem[];
  pending?: Pending | null;
};
type Snapshot = {
  pendingBookings: number;
  unconfirmedBookings: number;
  outstandingPaymentsSatang: number;
  outstandingPaymentCount: number;
  missingDocuments: number;
  renewalsThisMonth: number;
  overdueRenewals: number;
  followUpsDue: number;
  overdueTasks: number;
  openQuotes: number;
  vehicleSourcingOpen: number;
  recommendations: string[];
};
type Article = { id: string; title: string; body: string; category: string; active: boolean };
type PriceItem = { id: string; name: string; amountSatang: number; active: boolean; code: string };
type AuditEntry = { id: string; createdAt: string; actorEmail: string; action: string; status: string; summary: string };
type ChartBar = { label: string; value: number; display: string };
type Briefing = { title: string; lines: string[]; charts: { title: string; bars: ChartBar[] }[]; priorities: string[] };
type AutomationRule = { id: string; key: string; name: string; description: string; enabled: boolean };
type AutomationRun = { id: string; status: string; trigger: string; summary: string; error: string | null; actorLabel: string };
type AutomationData = { rules: AutomationRule[]; runs: AutomationRun[]; counts: { activeRules: number; pendingApproval: number; failed: number; completed: number } };

const PROMPTS = [
  "Show me all customers with outstanding payments.",
  "Summarise today's bookings.",
  "Which bookings haven't been confirmed?",
  "Find all driving licence renewals due this month.",
  "Show me this month's revenue.",
  "Find customers who haven't sent their required documents.",
  "Show all vehicles currently listed for sale.",
  "Show me all overdue staff tasks.",
  "Which services make us the most money?",
  "Where are bookings getting delayed?",
];

function baht(satang: number): string {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(satang / 100);
}

async function readJson(response: Response): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return response.json();
}

export function AssistantClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I read live SiamEZ records. Ask about bookings, customers, payments, renewals, vehicles, or tasks. I will ask before I change anything or send a message.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [llmConfigured, setLlmConfigured] = useState(false);
  const [tab, setTab] = useState<"knowledge" | "prices" | "audit" | "briefing" | "automation">("knowledge");
  const [articles, setArticles] = useState<Article[]>([]);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [automation, setAutomation] = useState<AutomationData | null>(null);
  const [articleTitle, setArticleTitle] = useState("");
  const [articleBody, setArticleBody] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const loadOverview = useCallback(async () => {
    const response = await fetch("/api/admin/assistant/overview");
    const body = await readJson(response);
    if (!body.success || !body.data || typeof body.data !== "object") return;
    const data = body.data as { role: "admin" | "staff"; llmConfigured: boolean; snapshot: Snapshot };
    setRole(data.role);
    setLlmConfigured(data.llmConfigured);
    setSnapshot(data.snapshot);
  }, []);

  const loadTab = useCallback(async (next: typeof tab) => {
    const path =
      next === "knowledge"
        ? "/api/admin/assistant/knowledge"
        : next === "prices"
          ? "/api/admin/assistant/prices"
          : next === "briefing"
            ? "/api/admin/assistant/briefing"
            : next === "automation"
              ? "/api/admin/assistant/automation"
              : "/api/admin/assistant/audit";
    const response = await fetch(path);
    const body = await readJson(response);
    if (!body.success || !body.data || typeof body.data !== "object") return;
    const data = body.data as {
      articles?: Article[];
      items?: PriceItem[];
      entries?: AuditEntry[];
      briefing?: Briefing;
      rules?: AutomationRule[];
      runs?: AutomationRun[];
      counts?: AutomationData["counts"];
    };
    if (data.articles) setArticles(data.articles);
    if (data.items) setPrices(data.items);
    if (data.entries) setAudit(data.entries);
    if (data.briefing) setBriefing(data.briefing);
    if (data.rules && data.runs && data.counts) setAutomation({ rules: data.rules, runs: data.runs, counts: data.counts });
  }, []);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("siamez.backoffice.conversation");
    if (stored) setConversationId(stored);
    void loadOverview();
    void loadTab("knowledge");
  }, [loadOverview, loadTab]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setDraft("");
    setError(null);
    setBusy(true);
    const localId = `local-${Date.now()}`;
    setMessages((current) => [...current, { id: localId, role: "user", content: message }]);
    try {
      const response = await fetch("/api/admin/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      });
      const body = await readJson(response);
      if (!body.success || !body.data || typeof body.data !== "object") {
        setError(typeof body.error === "string" ? body.error : "The assistant could not answer.");
        return;
      }
      const data = body.data as {
        conversationId: string;
        reply: string;
        links: LinkItem[];
        pending: Pending | null;
      };
      setConversationId(data.conversationId);
      window.sessionStorage.setItem("siamez.backoffice.conversation", data.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          links: data.links,
          pending: data.pending,
        },
      ]);
      void loadOverview();
    } catch {
      setError("The assistant could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(actionId: string, decision: "confirm" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/assistant/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, decision }),
      });
      const body = await readJson(response);
      if (!body.success || !body.data || typeof body.data !== "object") {
        setError(typeof body.error === "string" ? body.error : "Confirmation failed.");
        return;
      }
      const data = body.data as { summary: string; href?: string };
      setMessages((current) => [
        ...current,
        {
          id: `result-${Date.now()}`,
          role: "assistant",
          content: data.summary,
          links: data.href ? [{ href: data.href, label: "Open record" }] : [],
        },
      ]);
      void loadOverview();
    } catch {
      setError("Confirmation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveArticle(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/assistant/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: articleTitle, body: articleBody, category: "procedure" }),
    });
    const body = await readJson(response);
    if (!body.success) {
      setError(typeof body.error === "string" ? body.error : "Could not save the article.");
      return;
    }
    setArticleTitle("");
    setArticleBody("");
    await loadTab("knowledge");
  }

  async function savePrice(item: PriceItem, amountBaht: number) {
    const response = await fetch("/api/admin/assistant/prices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, amountBaht, active: item.active }),
    });
    const body = await readJson(response);
    if (!body.success) {
      setError(typeof body.error === "string" ? body.error : "Could not update the price.");
      return;
    }
    await loadTab("prices");
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-siam-blue">SiamEZ</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">AI Command Centre</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Ask in ordinary language. Workflows draft the repetitive booking steps. The briefing uses recorded figures. Changes and outbound messages wait for confirmation.
          {llmConfigured ? " A language model is connected for unfamiliar phrasing." : " Add an AI key later to understand a wider range of phrasing."}
        </p>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="flex min-h-[32rem] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <Sparkles className="h-5 w-5 text-siam-yellow-dark" />
            <h2 className="font-semibold text-siam-blue">Ask SiamEZ</h2>
          </div>
          <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "ml-8" : "mr-4"}>
                <div
                  className={
                    message.role === "user"
                      ? "rounded-2xl bg-siam-blue px-4 py-3 text-sm text-white"
                      : "rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  }
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.links && message.links.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.links.map((link) => (
                        <Link key={link.href + link.label} href={link.href} className="rounded-full bg-siam-yellow px-3 py-1 text-xs font-semibold text-siam-blue-dark">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  {message.pending ? (
                    <div className="mt-3 rounded-xl border border-siam-yellow bg-white p-3 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                      <p className="font-medium">{message.pending.summary}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => decide(message.pending!.id, "confirm")}
                          className="min-h-11 rounded-lg bg-siam-blue px-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => decide(message.pending!.id, "reject")}
                          className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-semibold disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 p-3 dark:border-gray-800">
            <div className="mb-2 flex gap-2 overflow-x-auto">
              {PROMPTS.slice(0, 4).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="shrink-0 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:border-siam-blue dark:border-gray-700 dark:text-gray-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
            >
              <label className="sr-only" htmlFor="assistant-query">
                Ask the assistant
              </label>
              <input
                id="assistant-query"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Search customers, bookings, payments, renewals…"
                className="min-h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950"
              />
              <button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-siam-yellow px-4 text-sm font-semibold text-siam-blue-dark disabled:opacity-50">
                {busy ? "Working" : "Ask"}
              </button>
            </form>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="font-semibold text-gray-900 dark:text-white">Operations</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Metric label="Open bookings" value={snapshot?.pendingBookings} />
              <Metric label="Unconfirmed" value={snapshot?.unconfirmedBookings} />
              <Metric label="Balances" value={snapshot ? baht(snapshot.outstandingPaymentsSatang) : undefined} />
              <Metric label="Missing docs" value={snapshot?.missingDocuments} />
              <Metric label="Renewals" value={snapshot?.renewalsThisMonth} />
              <Metric label="Follow-ups" value={snapshot?.followUpsDue} />
            </dl>
          </div>
          <div className="rounded-2xl border border-siam-yellow/70 bg-amber-50 p-4 dark:bg-gray-900">
            <h2 className="font-semibold text-siam-blue-dark dark:text-siam-yellow">Needs attention</h2>
            <ul className="mt-2 space-y-2 text-sm text-gray-800 dark:text-gray-200">
              {(snapshot?.recommendations ?? ["Loading today’s exceptions."]).map((item) => (
                <li key={item}>{item}</li>
              ))}
              {snapshot && snapshot.openQuotes > 0 ? <li>{snapshot.openQuotes} quotations are still open.</li> : null}
              {snapshot && snapshot.vehicleSourcingOpen > 0 ? <li>{snapshot.vehicleSourcingOpen} vehicle sourcing leads are open.</li> : null}
            </ul>
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap gap-2">
        {PROMPTS.slice(4).map((prompt) => (
          <button key={prompt} type="button" onClick={() => send(prompt)} className="rounded-full bg-gray-100 px-3 py-2 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-100">
            {prompt}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex gap-2">
          {(
            [
              ["knowledge", "Knowledge"],
              ["prices", "Prices"],
              ["briefing", "Briefing"],
              ["automation", "Automation"],
              ["audit", "Audit"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                void loadTab(id);
              }}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${tab === id ? "bg-siam-blue text-white" : "text-gray-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "knowledge" ? (
          <div className="mt-4 space-y-4">
            <form onSubmit={saveArticle} className="grid gap-2">
              <input value={articleTitle} onChange={(event) => setArticleTitle(event.target.value)} placeholder="Article title" className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-950" />
              <textarea value={articleBody} onChange={(event) => setArticleBody(event.target.value)} placeholder="Approved procedure, price note, or FAQ" rows={3} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
              <button type="submit" className="min-h-11 w-fit rounded-lg bg-siam-blue px-4 text-sm font-semibold text-white">Add article</button>
            </form>
            <ul className="space-y-3">
              {articles.map((article) => (
                <li key={article.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{article.category}</p>
                  <p className="font-semibold">{article.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{article.body}</p>
                  {role === "admin" ? (
                    <button
                      type="button"
                      className="mt-2 text-sm text-red-700"
                      onClick={async () => {
                        await fetch(`/api/admin/assistant/knowledge?id=${article.id}`, { method: "DELETE" });
                        await loadTab("knowledge");
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {tab === "prices" ? (
          <ul className="mt-4 space-y-3">
            {prices.map((item) => (
              <PriceRow key={item.id} item={item} canEdit={role === "admin"} onSave={savePrice} />
            ))}
          </ul>
        ) : null}
        {tab === "audit" ? (
          <ul className="mt-4 space-y-2 text-sm">
            {audit.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
                <span className="font-medium">{entry.action}</span> · {entry.status} · {entry.actorEmail}
                <p className="text-gray-600 dark:text-gray-400">{entry.summary}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {tab === "briefing" && briefing ? (
          <div className="mt-4 space-y-4">
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {briefing.lines.map((line) => <li key={line}>{line}</li>)}
            </ul>
            {briefing.charts.map((chart) => (
              <div key={chart.title}>
                <h2 className="text-sm font-semibold">{chart.title}</h2>
                <Bars items={chart.bars} />
              </div>
            ))}
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {briefing.priorities.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}
        {tab === "automation" && automation ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {automation.counts.activeRules} active · {automation.counts.completed} completed · {automation.counts.failed} failed · {automation.counts.pendingApproval} waiting for approval
            </p>
            <ul className="space-y-3">
              {automation.rules.map((rule) => (
                <li key={rule.id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{rule.name}</span>
                    {role === "admin" ? (
                      <button
                        type="button"
                        className="min-h-11 rounded-lg bg-gray-100 px-3 font-semibold dark:bg-gray-800"
                        onClick={async () => {
                          await fetch("/api/admin/assistant/automation", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ key: rule.key, enabled: !rule.enabled }),
                          });
                          await loadTab("automation");
                        }}
                      >
                        {rule.enabled ? "Turn off" : "Turn on"}
                      </button>
                    ) : (
                      <span>{rule.enabled ? "On" : "Off"}</span>
                    )}
                  </div>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{rule.description}</p>
                </li>
              ))}
            </ul>
            <ul className="space-y-2 text-sm">
              {automation.runs.map((run) => (
                <li key={run.id} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
                  <span className="font-medium">{run.trigger}</span> · {run.status} · {run.actorLabel}
                  <p className="text-gray-600 dark:text-gray-400">{run.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Bars({ items }: { items: ChartBar[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (items.length === 0) return <p className="mt-2 text-sm text-gray-500">No rows in this chart.</p>;
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex justify-between text-sm"><span>{item.label}</span><span>{item.display}</span></div>
          <div className="mt-1 h-2 rounded bg-gray-100 dark:bg-gray-800">
            <div className="h-2 rounded bg-siam-blue" style={{ width: `${Math.max(4, Math.round((item.value / max) * 100))}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Metric({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-siam-blue">{value ?? "—"}</dd>
    </div>
  );
}

function PriceRow({
  item,
  canEdit,
  onSave,
}: {
  item: PriceItem;
  canEdit: boolean;
  onSave: (item: PriceItem, amountBaht: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(item.amountSatang / 100));
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3 sm:flex-row sm:items-center dark:border-gray-800">
      <div className="flex-1">
        <p className="font-medium">{item.name}</p>
        <p className="text-xs text-gray-500">{item.code}</p>
      </div>
      <input
        value={amount}
        disabled={!canEdit}
        onChange={(event) => setAmount(event.target.value)}
        className="min-h-11 w-32 rounded-lg border border-gray-300 px-3 text-sm disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950"
        inputMode="decimal"
        aria-label={`${item.name} price in baht`}
      />
      {canEdit ? (
        <button type="button" onClick={() => onSave(item, Number(amount))} className="min-h-11 rounded-lg bg-siam-blue px-3 text-sm font-semibold text-white">
          Save
        </button>
      ) : (
        <span className="text-xs text-gray-500">Admin can edit</span>
      )}
    </li>
  );
}
