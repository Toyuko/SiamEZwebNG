import { Button } from "@/components/ui/button";

type StepFormProps = {
  action: (formData: FormData) => Promise<void>;
  defaults?: {
    key?: string | null;
    titleEn?: string;
    titleTh?: string | null;
    descriptionEn?: string | null;
    descriptionTh?: string | null;
    sortOrder?: number;
    kind?: string;
    requiresApproval?: boolean;
    targetJson?: string;
  };
  submitLabel: string;
};

export function StepForm({ action, defaults, submitLabel }: StepFormProps) {
  return (
    <form action={action} className="space-y-3 rounded-md border border-gray-200 p-4 dark:border-gray-800">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Title (EN)</span>
          <input
            name="titleEn"
            required
            defaultValue={defaults?.titleEn ?? ""}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Title (TH)</span>
          <input
            name="titleTh"
            defaultValue={defaults?.titleTh ?? ""}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Key</span>
          <input
            name="key"
            defaultValue={defaults?.key ?? ""}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Kind</span>
          <select
            name="kind"
            defaultValue={defaults?.kind ?? "action"}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="info">info</option>
            <option value="action">action</option>
            <option value="booking">booking</option>
            <option value="approval">approval</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Sort order</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={defaults?.sortOrder ?? 0}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Description (EN)</span>
        <textarea
          name="descriptionEn"
          rows={2}
          defaultValue={defaults?.descriptionEn ?? ""}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Target JSON</span>
        <textarea
          name="targetJson"
          rows={3}
          defaultValue={defaults?.targetJson ?? "{}"}
          placeholder='{"serviceSlug":"vehicle-registration","listingType":"vehicle"}'
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
        />
        <span className="text-xs text-gray-500">
          Use listingId cuid for deep links — never marketplace slugs.
        </span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="requiresApproval"
          value="1"
          defaultChecked={defaults?.requiresApproval ?? false}
        />
        <span>Requires staff approval</span>
      </label>
      <Button type="submit" size="sm">
        {submitLabel}
      </Button>
    </form>
  );
}
