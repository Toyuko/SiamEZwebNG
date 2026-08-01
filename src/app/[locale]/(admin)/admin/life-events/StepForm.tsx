import { Button } from "@/components/ui/button";
import { parseStepTarget } from "@/lib/life-events";

type StepFormProps = {
  action: (formData: FormData) => Promise<void>;
  stepId?: string;
  defaults?: {
    titleEn?: string;
    titleTh?: string | null;
    descriptionEn?: string | null;
    descriptionTh?: string | null;
    sortOrder?: number;
    target?: unknown;
  };
  submitLabel: string;
};

export function StepForm({ action, stepId, defaults, submitLabel }: StepFormProps) {
  const target = parseStepTarget(defaults?.target ?? {});

  return (
    <form action={action} className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      {stepId ? <input type="hidden" name="stepId" value={stepId} /> : null}
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
        <span className="font-medium">Description (TH)</span>
        <textarea
          name="descriptionTh"
          rows={2}
          defaultValue={defaults?.descriptionTh ?? ""}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Sort order</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={defaults?.sortOrder ?? 0}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <label className="block space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">Service slug</span>
          <input
            name="serviceSlug"
            defaultValue={target.serviceSlug ?? ""}
            placeholder="driver-license"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Listing type</span>
          <select
            name="listingType"
            defaultValue={target.listingType ?? ""}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">—</option>
            <option value="property">property</option>
            <option value="vehicle">vehicle</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">Listing id (cuid)</span>
          <input
            name="listingId"
            defaultValue={target.listingId ?? ""}
            placeholder="cl… (never slug)"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Target JSON (optional full override)</span>
        <textarea
          name="targetJson"
          rows={3}
          defaultValue=""
          placeholder='Leave blank to use fields above. Example: {"serviceSlug":"translation-services","listingType":"property"}'
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <Button type="submit" size="sm">
        {submitLabel}
      </Button>
    </form>
  );
}
