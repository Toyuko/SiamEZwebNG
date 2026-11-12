"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  approveUploadQuotationAction,
  createLicenceUploadRequestAction,
  deliverLicenceUploadRequestAction,
  loadLicenceChatPanelAction,
  rerunUploadAssessmentAction,
  revokeLicenceUploadRequestAction,
  searchLicenceCustomersAction,
} from "@/actions/licence-upload-request";
import { serviceTitle } from "@/lib/licence-verification/copy";
import { DOCUMENT_LABELS, LICENCE_DOCUMENT_TYPES, type LicenceDocumentType } from "@/lib/licence-verification/types";
import {
  buildUploadCustomerMessage,
  serviceKindFromSelection,
  type LicenceChatCard,
  type ServicePath,
  type ServiceVehicle,
} from "@/lib/licence-verification/upload-link";

type Customer = { id: string; name: string | null; email: string; phone: string | null };

const PATHS: { id: ServicePath; label: string }[] = [
  { id: "new", label: "New licence" },
  { id: "conversion", label: "Conversion" },
  { id: "renewal", label: "Renewal" },
  { id: "lost", label: "Lost or replacement" },
  { id: "idp", label: "International driving permit" },
];

const EVENT_LABELS: Record<string, string> = {
  created: "Created",
  follow_up: "Follow-up requested",
  sent_chat: "Saved in sales chat",
  sent_email: "Email",
  sent_push: "Push",
  opened: "Link opened",
  details_saved: "Details confirmed",
  uploaded: "Document uploaded",
  replaced: "Document replaced",
  submitted: "Submitted",
  ai_started: "AI screening started",
  ai_findings: "AI findings",
  revoked: "Link revoked",
  expired: "Link expired",
  quotation_approved: "Approved for quotation",
};

export function LicenceRequestPanel({
  conversationId,
  onConversation,
  onPosted,
}: {
  conversationId: string | null;
  onConversation: (id: string) => void;
  onPosted: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<LicenceChatCard[]>([]);
  const [knownCustomer, setKnownCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");
  const [path, setPath] = useState<ServicePath>("conversion");
  const [vehicle, setVehicle] = useState<ServiceVehicle>("car");
  const [note, setNote] = useState("");
  const [expiryDays, setExpiryDays] = useState("");
  const [extras, setExtras] = useState<string[]>([]);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<{ requestId: string; link: string; message: string; emailAvailable: boolean; referenceNumber: string } | null>(null);
  const [message, setMessage] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (id: string | null) => {
    const loaded = await loadLicenceChatPanelAction(id);
    if (!loaded.ok) return;
    setKnownCustomer(loaded.customer);
    setRequests(loaded.requests);
  }, []);

  useEffect(() => {
    void reload(conversationId);
  }, [conversationId, reload]);

  function useCustomer(customer: Customer) {
    setSelected(customer);
    setName(customer.name ?? "");
    setEmail(customer.email);
    setPhone(customer.phone ?? "");
    setCustomers([]);
  }

  async function createLink() {
    setBusy(true);
    setError(null);
    setStatus(null);
    const expiresAt = expiryDays ? new Date(Date.now() + Number(expiryDays) * 24 * 60 * 60 * 1000).toISOString() : null;
    const created = await createLicenceUploadRequestAction({
      conversationId,
      applicationId,
      userId: selected?.id,
      customerName: name,
      email,
      phone,
      serviceKind: serviceKindFromSelection(path, vehicle),
      vehicle,
      message: note,
      expiresAt,
      extraDocuments: extras,
      locale: "en",
    });
    setBusy(false);
    if (!created.ok) {
      setError(created.error);
      return;
    }
    setPrepared({
      requestId: created.requestId,
      link: created.link,
      message: created.message,
      emailAvailable: created.emailAvailable,
      referenceNumber: created.referenceNumber,
    });
    setMessage(created.message);
    onConversation(created.conversationId);
    await reload(created.conversationId);
  }

  async function deliver(chat: boolean, emailSend: boolean) {
    if (!prepared) return;
    setBusy(true);
    setError(null);
    const sent = await deliverLicenceUploadRequestAction({
      requestId: prepared.requestId,
      message,
      chat,
      email: emailSend,
    });
    setBusy(false);
    if (!sent.ok) {
      setError(sent.error);
      return;
    }
    if (sent.channels.chat === "posted") onPosted(sent.message);
    if (sent.conversationId) onConversation(sent.conversationId);
    setStatus(channelSummary(sent.channels));
    await reload(sent.conversationId);
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label} copied.`);
    } catch {
      setError("Copy failed. Select the text and copy it manually.");
    }
  }

  return (
    <div id="licence-upload-request" className="border-t border-gray-200 px-3 py-3 dark:border-gray-800">
      <button
        type="button"
        className="min-h-11 rounded-xl bg-[#2c54c6] px-3 text-sm font-semibold text-white"
        onClick={() => setOpen((current) => !current)}
      >
        Request Driving Licence Documents
      </button>
      {requests[0] ? <p className="mt-2 text-xs text-gray-500">Latest link: {requests[0].referenceNumber} · {requests[0].linkStatus}</p> : null}

      {open ? (
        <form
          className="mt-3 grid gap-2 text-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void createLink();
          }}
        >
          <p className="text-gray-600 dark:text-gray-300">
            {knownCustomer ? `This chat is with ${knownCustomer.name || knownCustomer.email}.` : "No customer is attached to this chat yet."}
          </p>
          {knownCustomer ? (
            <button type="button" className="min-h-11 w-fit rounded-lg border px-3 font-semibold" onClick={() => useCustomer(knownCustomer)}>
              Use {knownCustomer.name || knownCustomer.email}
            </button>
          ) : null}
          <label>
            Find a customer
            <input
              className="mt-1 min-h-11 w-full rounded-lg border px-3 dark:border-gray-700 dark:bg-gray-950"
              value={query}
              placeholder="Name, email, or phone"
              onChange={(event) => {
                const next = event.target.value;
                setQuery(next);
                if (next.trim().length < 2) {
                  setCustomers([]);
                  return;
                }
                void searchLicenceCustomersAction(next).then((found) => {
                  if (found.ok) setCustomers(found.customers);
                });
              }}
            />
          </label>
          {customers.length > 0 ? (
            <ul className="rounded-lg border dark:border-gray-700">
              {customers.map((customer) => (
                <li key={customer.id}>
                  <button type="button" className="min-h-11 w-full px-3 text-left" onClick={() => useCustomer(customer)}>
                    {customer.name || "Customer"} · {customer.email}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {selected ? <p className="text-xs text-[#2c54c6]">Using account {selected.email}. A new customer record will not be created.</p> : null}
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="min-h-11 rounded-lg border px-3 dark:border-gray-700 dark:bg-gray-950" placeholder="Customer name" value={name} onChange={(event) => setName(event.target.value)} />
            <input className="min-h-11 rounded-lg border px-3 dark:border-gray-700 dark:bg-gray-950" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <input className="min-h-11 rounded-lg border px-3 dark:border-gray-700 dark:bg-gray-950" placeholder="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="min-h-11 rounded-lg border px-3 dark:border-gray-700 dark:bg-gray-950" value={path} onChange={(event) => setPath(event.target.value as ServicePath)}>
              {PATHS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <select className="min-h-11 rounded-lg border px-3 dark:border-gray-700 dark:bg-gray-950" value={vehicle} onChange={(event) => setVehicle(event.target.value as ServiceVehicle)} disabled={path === "idp"}>
              <option value="car">Car</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="both">Both</option>
            </select>
            <select className="min-h-11 rounded-lg border px-3 dark:border-gray-700 dark:bg-gray-950" value={expiryDays} onChange={(event) => setExpiryDays(event.target.value)}>
              <option value="">No expiry</option>
              <option value="7">Expires in 7 days</option>
              <option value="14">Expires in 14 days</option>
              <option value="30">Expires in 30 days</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">{serviceTitle(serviceKindFromSelection(path, vehicle), "en")}</p>
          <textarea className="min-h-20 rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-950" placeholder="Optional note to the customer" value={note} onChange={(event) => setNote(event.target.value)} />
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500">Add documents to the checklist</legend>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {LICENCE_DOCUMENT_TYPES.map((type) => (
                <label key={type} className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={extras.includes(type)}
                    onChange={(event) => {
                      setExtras((current) => event.target.checked ? [...current, type] : current.filter((item) => item !== type));
                    }}
                  />
                  {DOCUMENT_LABELS[type]}
                </label>
              ))}
            </div>
          </fieldset>
          {applicationId ? <p className="text-xs">This request stays on the current application.</p> : null}
          <button type="submit" disabled={busy} className="min-h-11 w-fit rounded-lg bg-[#ffce2d] px-4 font-bold text-[#2344b0] disabled:opacity-50">
            {busy ? "Working" : "Create upload link"}
          </button>
        </form>
      ) : null}

      {prepared ? (
        <div className="mt-3 space-y-2 rounded-xl border border-[#ffce2d] bg-amber-50 p-3 text-sm dark:bg-gray-900">
          <p className="font-semibold">{prepared.referenceNumber}</p>
          <textarea className="min-h-36 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-950" value={message} onChange={(event) => setMessage(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} className="min-h-11 rounded-lg bg-[#2c54c6] px-3 font-semibold text-white" onClick={() => void deliver(true, false)}>Save in this chat</button>
            <button type="button" disabled={busy || !prepared.emailAvailable} className="min-h-11 rounded-lg bg-[#2c54c6] px-3 font-semibold text-white disabled:opacity-50" onClick={() => void deliver(true, true)}>Save in chat and email</button>
            <button type="button" className="min-h-11 rounded-lg border px-3 font-semibold" onClick={() => void copy(prepared.link, "Link")}>Copy link</button>
            <button type="button" className="min-h-11 rounded-lg border px-3 font-semibold" onClick={() => void copy(message, "Message")}>Copy message</button>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            This sales chat can store the message for you. It does not deliver to the customer. Email sends when an address exists and the mailer is configured. LINE and WhatsApp have no sender here — copy the message. A push is sent only when the customer already has the app.
          </p>
        </div>
      ) : null}
      {status ? <p className="mt-2 text-sm text-emerald-800">{status}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      <ul className="mt-3 space-y-3">
        {requests.map((card) => (
          <li key={card.requestId} className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">
            <p className="font-semibold">{card.referenceNumber} · {card.serviceLabel}</p>
            <p>{card.customerName}{card.email ? ` · ${card.email}` : ""}{card.phone ? ` · ${card.phone}` : ""}</p>
            <p className="mt-1">Link {card.linkStatus}{card.expiresAt ? ` · expires ${card.expiresAt.slice(0, 10)}` : ""} · application {card.applicationStatus.replaceAll("_", " ").toLowerCase()}</p>
            <p>Documents received: {card.documents.filter((doc) => doc.active).length}. Outstanding: {card.outstanding.length ? card.outstanding.map((type) => DOCUMENT_LABELS[type as LicenceDocumentType] ?? type).join(", ") : "none"}.</p>
            <p>AI: {card.aiOutcome ?? "not run"}. {card.aiSummary ?? ""}</p>
            <p>{card.quotationEligible ? "Staff approval is recorded, so the existing quotation flow can continue." : "Quotation stays blocked until a staff member approves it. An AI pass is not approval and does not create an invoice."}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="min-h-11 rounded-lg border px-3" onClick={() => void copy(card.link, "Link")}>Copy link</button>
              <button
                type="button"
                className="min-h-11 rounded-lg border px-3"
                onClick={() => {
                  const text = buildUploadCustomerMessage({ link: card.link });
                  setPrepared({ requestId: card.requestId, link: card.link, message: text, emailAvailable: Boolean(card.email), referenceNumber: card.referenceNumber });
                  setMessage(text);
                }}
              >
                Resend
              </button>
              <button
                type="button"
                className="min-h-11 rounded-lg border px-3"
                onClick={() => {
                  setApplicationId(card.applicationId);
                  setName(card.customerName);
                  setEmail(card.email ?? "");
                  setPhone(card.phone ?? "");
                  setExtras(card.outstanding);
                  setOpen(true);
                }}
              >
                Request missing docs
              </button>
              <Link href={card.adminHref} className="inline-flex min-h-11 items-center rounded-lg border px-3">View assessment</Link>
              <button type="button" className="min-h-11 rounded-lg border px-3" onClick={() => void rerunUploadAssessmentAction(card.requestId).then(() => reload(conversationId))}>Run AI</button>
              <button type="button" className="min-h-11 rounded-lg border px-3" onClick={() => void revokeLicenceUploadRequestAction(card.requestId).then(() => reload(conversationId))}>Revoke</button>
            </div>
            {card.documents.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {card.documents.map((doc) => (
                  <li key={doc.id}>
                    <a className="text-[#2c54c6] underline" href={`/api/licence-verification/documents/${doc.id}`} target="_blank" rel="noreferrer">
                      {doc.active ? doc.label : `${doc.label} (replaced)`}: {doc.originalName}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {card.aiOutcome !== "PASS" ? (
              <label className="mt-2 block text-xs">
                Override reason, if screening is not a pass
                <input className="mt-1 min-h-11 w-full rounded-lg border px-3 dark:border-gray-700 dark:bg-gray-950" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} />
              </label>
            ) : null}
            <button
              type="button"
              className="mt-2 min-h-11 rounded-lg bg-[#2c54c6] px-3 font-semibold text-white"
              onClick={() => void approveUploadQuotationAction(card.requestId, overrideReason).then((result) => {
                if (!result.ok) setError(result.error);
                else {
                  setStatus("Approved for quotation. No invoice was created.");
                  void reload(conversationId);
                }
              })}
            >
              Approve for quotation
            </button>
            <ol className="mt-3 space-y-1 border-t pt-2 text-xs text-gray-600 dark:text-gray-300">
              {card.timeline.map((event) => (
                <li key={event.id}>
                  {event.createdAt.slice(0, 16).replace("T", " ")} · {EVENT_LABELS[event.event] ?? event.event} · {event.detail}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
    </div>
  );
}

function channelSummary(channels: {
  chat: string;
  email: string;
  push: string;
  line: string;
  whatsapp: string;
}): string {
  const email = channels.email === "sent"
    ? "Email sent."
    : channels.email === "skipped"
      ? "Email was not sent because the mailer is not configured. Copy the message."
      : channels.email === "failed"
        ? "Email failed. Copy the message."
        : "No email was sent.";
  const chat = channels.chat === "posted" ? "The message is saved in this sales chat." : "The message was not posted in chat.";
  const push = channels.push === "sent" ? "Push sent." : "No push was sent.";
  return `${chat} ${email} ${push} LINE is copy-only. WhatsApp is copy-only.`;
}
