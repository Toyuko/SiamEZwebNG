import { Button } from "@/components/ui/button";

type WorkflowTemplateFormProps = {
  action: (formData: FormData) => Promise<void>;
  defaults?: {
    key?: string;
    titleEn?: string;
    titleTh?: string | null;
    descriptionEn?: string | null;
    descriptionTh?: string | null;
    active?: boolean;
    sortOrder?: number;
  };
  submitLabel: string;
};

export function WorkflowTemplateForm({
  action,
  defaults,
  submitLabel,
}: WorkflowTemplateFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">Key (slug)</span>
          <input
            name="key"
            required
            defaultValue={defaults?.key ?? ""}
            placeholder="vehicle-inspection-booking"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">Sort order</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={defaults?.sortOrder ?? 0}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">Title (EN)</span>
        <input
          name="titleEn"
          required
          defaultValue={defaults?.titleEn ?? ""}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">Title (TH)</span>
        <input
          name="titleTh"
          defaultValue={defaults?.titleTh ?? ""}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">Description (EN)</span>
        <textarea
          name="descriptionEn"
          rows={3}
          defaultValue={defaults?.descriptionEn ?? ""}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">Description (TH)</span>
        <textarea
          name="descriptionTh"
          rows={3}
          defaultValue={defaults?.descriptionTh ?? ""}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          value="1"
          defaultChecked={defaults?.active ?? true}
        />
        <span className="text-gray-700 dark:text-gray-300">Active</span>
      </label>
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
