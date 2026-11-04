"use client";

import { useEffect, useState } from "react";

type Preset = { id: string; label: string; baseUrl: string; model: string };
type Provider = { id: string; label: string; preset: string; baseUrl: string; model: string; enabled: boolean; hasKey: boolean };
type Settings = {
  presets: Preset[];
  tasks: string[];
  tools: string[];
  defaultProviderId: string | null;
  fallbackProviderId: string | null;
  taskRouting: Record<string, string | null>;
  disabledTools: string[];
  providers: Provider[];
};
type Template = { id: string; name: string; purpose: string; body: string };

async function readJson(response: Response): Promise<{ success?: boolean; data?: unknown; error?: { message?: string } }> {
  return response.json();
}

export function ModelsPanel({ role }: { role: "admin" | "staff" }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [preset, setPreset] = useState("openai");
  const [label, setLabel] = useState("OpenAI");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1/chat/completions");
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/assistant/providers");
    const body = await readJson(response);
    if (body.success && body.data && typeof body.data === "object") setSettings(body.data as Settings);
  }

  useEffect(() => {
    void load();
  }, []);

  if (!settings) return <p className="mt-4 text-sm text-gray-500">Loading models.</p>;

  async function save(next: Settings, providers = next.providers) {
    const response = await fetch("/api/admin/assistant/providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providers: providers.map((item) => ({ ...item, apiKey: "" })),
        defaultProviderId: next.defaultProviderId,
        fallbackProviderId: next.fallbackProviderId,
        tasks: next.taskRouting,
        disabledTools: next.disabledTools,
      }),
    });
    const body = await readJson(response);
    if (!body.success) {
      setMessage(body.error?.message ?? "The model settings were not saved.");
      return;
    }
    setSettings(body.data as Settings);
    setMessage("Saved. Keys stay on the server.");
  }

  return (
    <div className="mt-4 space-y-4 text-sm">
      <p className="text-gray-600 dark:text-gray-400">
        OpenAI, DeepSeek, Mistral, Llama, Qwen, and a local Ollama server all use the same chat interface. The assistant still reads SiamEZ records itself. A model only helps with unfamiliar phrasing and translation.
      </p>
      <ul className="space-y-2">
        {settings.providers.map((item) => (
          <li key={item.id} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
            <span className="font-semibold">{item.label}</span> · {item.model} · {item.hasKey ? "key stored" : "no key"} · {item.enabled ? "on" : "off"}
            {settings.defaultProviderId === item.id ? " · default" : ""}
            {settings.fallbackProviderId === item.id ? " · fallback" : ""}
          </li>
        ))}
        {settings.providers.length === 0 ? <li>No provider has been added. The environment key is still used when it is set.</li> : null}
      </ul>
      {role === "admin" ? (
        <form
          className="grid gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const response = await fetch("/api/admin/assistant/providers", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                providers: [
                  ...settings.providers.map((item) => ({ ...item })),
                  { label, preset, baseUrl, model, apiKey, enabled: true },
                ],
                defaultProviderId: settings.defaultProviderId,
                fallbackProviderId: settings.fallbackProviderId,
                tasks: settings.taskRouting,
                disabledTools: settings.disabledTools,
              }),
            });
            const body = await readJson(response);
            if (!body.success) {
              setMessage(body.error?.message ?? "The provider was not added.");
              return;
            }
            setApiKey("");
            setSettings(body.data as Settings);
            setMessage("Provider added. The key was not shown again.");
          }}
        >
          <div className="grid gap-2 md:grid-cols-2">
            <select
              value={preset}
              onChange={(event) => {
                const next = settings.presets.find((item) => item.id === event.target.value);
                setPreset(event.target.value);
                if (!next) return;
                setLabel(next.label);
                setBaseUrl(next.baseUrl);
                setModel(next.model);
              }}
              className="min-h-11 rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950"
            >
              {settings.presets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <input value={label} onChange={(event) => setLabel(event.target.value)} className="min-h-11 rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950" />
            <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Model name" className="min-h-11 rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950" />
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https:// or http://127.0.0.1" className="min-h-11 rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950" />
            <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" autoComplete="off" placeholder="API key, leave blank for a local model" className="min-h-11 rounded-lg border border-gray-300 px-3 md:col-span-2 dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <button type="submit" className="min-h-11 w-fit rounded-lg bg-siam-blue px-4 font-semibold text-white">Add provider</button>
          <div className="grid gap-2 md:grid-cols-2">
            <label>Default
              <select value={settings.defaultProviderId ?? ""} onChange={(event) => void save({ ...settings, defaultProviderId: event.target.value || null })} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950">
                <option value="">Environment default</option>
                {settings.providers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label>Fallback
              <select value={settings.fallbackProviderId ?? ""} onChange={(event) => void save({ ...settings, fallbackProviderId: event.target.value || null })} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950">
                <option value="">None</option>
                {settings.providers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {settings.tasks.map((task) => (
              <label key={task}>{task}
                <select
                  value={settings.taskRouting[task] ?? ""}
                  onChange={(event) => void save({ ...settings, taskRouting: { ...settings.taskRouting, [task]: event.target.value || null } })}
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950"
                >
                  <option value="">Default model</option>
                  {settings.providers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
            ))}
          </div>
          <fieldset>
            <legend className="font-semibold">Actions staff may confirm</legend>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {settings.tools.map((tool) => (
                <label key={tool} className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!settings.disabledTools.includes(tool)}
                    onChange={(event) => {
                      const disabledTools = event.target.checked
                        ? settings.disabledTools.filter((item) => item !== tool)
                        : [...settings.disabledTools, tool];
                      void save({ ...settings, disabledTools });
                    }}
                  />
                  {tool.replaceAll("_", " ")}
                </label>
              ))}
            </div>
          </fieldset>
        </form>
      ) : (
        <p>An administrator chooses the models and which actions are available.</p>
      )}
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function TemplatesPanel({ onUse }: { onUse: (body: string) => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  useEffect(() => {
    void fetch("/api/admin/assistant/templates")
      .then((response) => response.json())
      .then((body: { success?: boolean; data?: { templates?: Template[] } }) => {
        if (body.success && body.data?.templates) setTemplates(body.data.templates);
      });
  }, []);
  return (
    <ul className="mt-4 space-y-3">
      {templates.map((template) => (
        <li key={template.id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">{template.name}</span>
            <button type="button" className="min-h-11 rounded-lg bg-gray-100 px-3 font-semibold dark:bg-gray-800" onClick={() => onUse(template.body)}>
              Edit in chat
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{template.purpose}</p>
          <pre className="mt-2 whitespace-pre-wrap text-gray-700 dark:text-gray-300">{template.body}</pre>
        </li>
      ))}
    </ul>
  );
}
