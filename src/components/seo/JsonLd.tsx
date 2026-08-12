import type { JsonLd } from "@/lib/seo/jsonld";

type JsonLdScriptProps = {
  data: JsonLd | JsonLd[] | null | undefined;
};

/** Renders one or more Schema.org objects as JSON-LD. */
export function JsonLdScript({ data }: JsonLdScriptProps) {
  if (!data) return null;
  const payload = Array.isArray(data) ? data.filter(Boolean) : data;
  if (Array.isArray(payload) && payload.length === 0) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
