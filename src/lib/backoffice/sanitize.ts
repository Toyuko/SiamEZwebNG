const MAX_LENGTH = 4000;

const INJECTION_PATTERNS: { flag: string; pattern: RegExp }[] = [
  { flag: "ignore-instructions", pattern: /ignore (all |any |previous |above )?(instructions|rules)/i },
  { flag: "role-override", pattern: /you are now|act as (a |an )?(system|root|developer)/i },
  { flag: "system-prompt", pattern: /system prompt|developer message/i },
  { flag: "secret-exfiltration", pattern: /reveal (the )?(api key|secret|password)|print (the )?env/i },
  { flag: "bypass-controls", pattern: /bypass (auth|permission|confirmation|approval)/i },
];

export type SanitizedInstruction = {
  text: string;
  flags: string[];
  truncated: boolean;
};

export function sanitizeStaffInstruction(input: string): SanitizedInstruction {
  const cleaned = input.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
  const truncated = cleaned.length > MAX_LENGTH;
  const text = truncated ? cleaned.slice(0, MAX_LENGTH) : cleaned;
  const flags = INJECTION_PATTERNS.filter((item) => item.pattern.test(text)).map((item) => item.flag);
  return { text, flags, truncated };
}

/** Marks customer or document text so a model cannot treat it as an instruction. */
export function wrapUntrusted(label: string, text: string): string {
  const safe = text.replace(/<\/untrusted>/gi, "");
  return `<untrusted source="${label}">\n${safe}\n</untrusted>`;
}
