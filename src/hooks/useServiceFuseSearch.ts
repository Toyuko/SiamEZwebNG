"use client";

import { useMemo } from "react";
import Fuse, { type IFuseOptions } from "fuse.js";
import { getServiceSearchMeta } from "@/config/service-search";
import type { DisplayService } from "@/components/sections/ServicesGrid";

export type FuseSearchableService<T extends DisplayService = DisplayService> = T & {
  categoryKey: string;
  categoryLabel: string;
  keywords: string[];
  searchText: string;
};

const FUSE_OPTIONS: IFuseOptions<FuseSearchableService> = {
  keys: [
    { name: "name", weight: 0.35 },
    { name: "shortDescription", weight: 0.25 },
    { name: "description", weight: 0.15 },
    { name: "categoryLabel", weight: 0.15 },
    { name: "keywords", weight: 0.25 },
    { name: "searchText", weight: 0.1 },
  ],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
};

export function buildFuseSearchableServices<T extends DisplayService>(
  services: T[],
  categoryLabels: Record<string, string>
): FuseSearchableService<T>[] {
  return services.map((service) => {
    const meta = getServiceSearchMeta(service.slug);
    const categoryLabel = categoryLabels[meta.categoryKey] ?? meta.categoryKey;
    const desc = service.shortDescription ?? service.description ?? "";
    return {
      ...service,
      categoryKey: meta.categoryKey,
      categoryLabel,
      keywords: meta.keywords,
      searchText: [service.name, service.slug, desc, ...meta.keywords].join(" "),
    };
  });
}

export function useServiceFuseSearch<T extends DisplayService>(
  services: T[],
  query: string,
  categoryLabels: Record<string, string>
): FuseSearchableService<T>[] {
  const searchable = useMemo(
    () => buildFuseSearchableServices(services, categoryLabels),
    [services, categoryLabels]
  );

  const fuse = useMemo(() => new Fuse(searchable, FUSE_OPTIONS), [searchable]);

  return useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return searchable;
    return fuse.search(trimmed).map((r) => r.item);
  }, [fuse, query, searchable]);
}

/** Group fuse results by category label for command palette UI */
export function groupServicesByCategory<T extends DisplayService>(
  results: FuseSearchableService<T>[]
): { category: string; items: FuseSearchableService<T>[] }[] {
  const map = new Map<string, FuseSearchableService<T>[]>();
  for (const item of results) {
    const list = map.get(item.categoryLabel) ?? [];
    list.push(item);
    map.set(item.categoryLabel, list);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}
