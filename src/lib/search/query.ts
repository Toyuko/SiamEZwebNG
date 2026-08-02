/**
 * Grouped Fuse query over a unified search index.
 */

import Fuse, { type IFuseOptions } from "fuse.js";
import type {
  BookingSearchDocument,
  GoalSearchDocument,
  GroupedSearchResults,
  HelpSearchDocument,
  LifeEventSearchDocument,
  PropertySearchDocument,
  SearchDocument,
  ServiceSearchDocument,
  UnifiedSearchQueryOptions,
  VehicleSearchDocument,
} from "@/lib/search/types";

const FUSE_OPTIONS: IFuseOptions<SearchDocument> = {
  keys: [
    { name: "title", weight: 0.4 },
    { name: "subtitle", weight: 0.2 },
    { name: "keywords", weight: 0.25 },
    { name: "searchText", weight: 0.15 },
  ],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
};

export function emptyGroupedSearchResults(): GroupedSearchResults {
  return {
    services: [],
    vehicles: [],
    properties: [],
    help: [],
    lifeEvents: [],
    goals: [],
    bookings: [],
  };
}

/** Partition a flat hit list into typed groups (order preserved within each). */
export function groupSearchDocuments(docs: SearchDocument[]): GroupedSearchResults {
  const groups = emptyGroupedSearchResults();
  for (const doc of docs) {
    switch (doc.division) {
      case "service":
        groups.services.push(doc);
        break;
      case "vehicle":
        groups.vehicles.push(doc);
        break;
      case "property":
        groups.properties.push(doc);
        break;
      case "help":
        groups.help.push(doc);
        break;
      case "life_event":
        groups.lifeEvents.push(doc);
        break;
      case "goal":
        groups.goals.push(doc);
        break;
      case "booking":
        groups.bookings.push(doc);
        break;
      default:
        break;
    }
  }
  return groups;
}

function truncateGroups(
  groups: GroupedSearchResults,
  limitPerGroup: number
): GroupedSearchResults {
  return {
    services: groups.services.slice(0, limitPerGroup) as ServiceSearchDocument[],
    vehicles: groups.vehicles.slice(0, limitPerGroup) as VehicleSearchDocument[],
    properties: groups.properties.slice(0, limitPerGroup) as PropertySearchDocument[],
    help: groups.help.slice(0, limitPerGroup) as HelpSearchDocument[],
    lifeEvents: groups.lifeEvents.slice(0, limitPerGroup) as LifeEventSearchDocument[],
    goals: groups.goals.slice(0, limitPerGroup) as GoalSearchDocument[],
    bookings: groups.bookings.slice(0, limitPerGroup) as BookingSearchDocument[],
  };
}

/**
 * Run a unified search against an in-memory document index.
 * Empty / whitespace query → empty groups (no crash).
 */
export function queryUnifiedSearch(
  documents: SearchDocument[],
  query: string,
  options: UnifiedSearchQueryOptions = {}
): GroupedSearchResults {
  const limitPerGroup = options.limitPerGroup ?? 8;
  const emptyReturnsEmpty = options.emptyReturnsEmpty !== false;

  try {
    const trimmed = (query ?? "").trim();
    if (!trimmed) {
      if (emptyReturnsEmpty) return emptyGroupedSearchResults();
      return truncateGroups(groupSearchDocuments(documents), limitPerGroup);
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      return emptyGroupedSearchResults();
    }

    const fuse = new Fuse(documents, FUSE_OPTIONS);
    const hits = fuse.search(trimmed).map((r) => r.item);
    return truncateGroups(groupSearchDocuments(hits), limitPerGroup);
  } catch {
    return emptyGroupedSearchResults();
  }
}

/** Total hit count across groups. */
export function countGroupedResults(groups: GroupedSearchResults): number {
  return (
    groups.services.length +
    groups.vehicles.length +
    groups.properties.length +
    groups.help.length +
    groups.lifeEvents.length +
    groups.goals.length +
    groups.bookings.length
  );
}
