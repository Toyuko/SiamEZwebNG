"use client";

import { useActionState } from "react";
import { saveCategory, saveService, retireCategory, retireService, type DirectoryActionState } from "@/actions/directory";
import { ConfirmSubmit } from "@/components/directory/ConfirmSubmit";
import type { DirectoryCopy } from "@/lib/directory/copy";

const field = "mt-1 w-full rounded-lg border px-3 py-2 text-sm";

export function TaxonomyManager({
  copy,
  categories,
  services,
}: {
  copy: DirectoryCopy;
  categories: Array<{
    id: string;
    slug: string;
    nameEn: string;
    nameTh: string;
    descriptionEn: string | null;
    descriptionTh: string | null;
    sortOrder: number;
    active: boolean;
  }>;
  services: Array<{
    id: string;
    slug: string;
    nameEn: string;
    nameTh: string;
    sortOrder: number;
    active: boolean;
  }>;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h2 className="text-lg font-semibold">{copy.category}</h2>
        <ItemForm copy={copy} action={saveCategory} />
        <ul className="mt-4 space-y-3">
          {categories.map((category) => (
            <li key={category.id} className="rounded-xl border border-border p-3">
              <ItemForm copy={copy} action={saveCategory} item={category} />
              <ConfirmSubmit action={retireCategory} confirmText={copy.retireConfirm} fields={{ id: category.id }}>
                {copy.archive}
              </ConfirmSubmit>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold">{copy.services}</h2>
        <ItemForm copy={copy} action={saveService} service />
        <ul className="mt-4 space-y-3">
          {services.map((service) => (
            <li key={service.id} className="rounded-xl border border-border p-3">
              <ItemForm copy={copy} action={saveService} item={service} service />
              <ConfirmSubmit action={retireService} confirmText={copy.retireConfirm} fields={{ id: service.id }}>
                {copy.archive}
              </ConfirmSubmit>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ItemForm({
  copy,
  action,
  item,
  service,
}: {
  copy: DirectoryCopy;
  action: (state: DirectoryActionState, form: FormData) => Promise<DirectoryActionState>;
  item?: {
    id: string;
    slug: string;
    nameEn: string;
    nameTh: string;
    descriptionEn?: string | null;
    descriptionTh?: string | null;
    sortOrder: number;
    active: boolean;
  };
  service?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-2">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <input name="nameEn" required defaultValue={item?.nameEn} placeholder={copy.nameEn} className={field} />
      <input name="nameTh" required defaultValue={item?.nameTh} placeholder={copy.nameTh} className={field} />
      <input name="slug" defaultValue={item?.slug} placeholder={copy.slug} className={field} />
      {service ? null : (
        <>
          <textarea name="descriptionEn" defaultValue={item?.descriptionEn ?? ""} placeholder={`${copy.description} EN`} className={field} />
          <textarea name="descriptionTh" defaultValue={item?.descriptionTh ?? ""} placeholder={`${copy.description} TH`} className={field} />
        </>
      )}
      <input name="sortOrder" defaultValue={item?.sortOrder ?? 0} className={field} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={item?.active ?? true} />
        {copy.active}
      </label>
      {state?.message ? <p className="text-sm">{state.message}</p> : null}
      <button disabled={pending} className="h-10 rounded-lg bg-siam-blue text-sm font-semibold text-white">
        {item ? copy.save : copy.add}
      </button>
    </form>
  );
}
