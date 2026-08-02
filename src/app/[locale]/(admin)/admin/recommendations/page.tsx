import { setRequestLocale } from "next-intl/server";
import {
  listRecommendationEdges,
  seedDefaultRecommendationEdges,
} from "@/data-access/recommendation-edges";
import {
  seedRecommendationEdgesAction,
  toggleRecommendationEdgeAction,
  upsertRecommendationEdgeAction,
} from "@/actions/recommendation-edges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminRecommendationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let edges = await listRecommendationEdges().catch(() => []);
  if (edges.length === 0) {
    await seedDefaultRecommendationEdges().catch(() => null);
    edges = await listRecommendationEdges().catch(() => []);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Recommendation graph
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configurable cross-sell relationships. Defaults match the Platform 2.0 graph;
            edits apply without redeploying hard-coded packages.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await seedRecommendationEdgesAction();
          }}
        >
          <Button type="submit" variant="outline">
            Seed defaults if empty
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add / update edge</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              "use server";
              await upsertRecommendationEdgeAction(formData);
            }}
            className="grid gap-3 md:grid-cols-2"
          >
            <label className="text-sm">
              Key
              <input name="key" required className="mt-1 w-full rounded border px-2 py-1.5" />
            </label>
            <label className="text-sm">
              Trigger
              <select name="triggerKey" className="mt-1 w-full rounded border px-2 py-1.5" defaultValue="motorcycle">
                <option value="motorcycle">motorcycle</option>
                <option value="vehicle">vehicle</option>
                <option value="property">property</option>
                <option value="query:motorcycle">query:motorcycle</option>
                <option value="query:vehicle">query:vehicle</option>
                <option value="query:property">query:property</option>
              </select>
            </label>
            <label className="text-sm">
              Target kind
              <select name="targetKind" className="mt-1 w-full rounded border px-2 py-1.5" defaultValue="service">
                <option value="service">service</option>
                <option value="life_event">life_event</option>
              </select>
            </label>
            <label className="text-sm">
              Target key (slug / life-event key)
              <input name="targetKey" required className="mt-1 w-full rounded border px-2 py-1.5" />
            </label>
            <label className="text-sm">
              Score
              <input name="score" type="number" defaultValue={80} className="mt-1 w-full rounded border px-2 py-1.5" />
            </label>
            <label className="text-sm">
              Sort order
              <input name="sortOrder" type="number" defaultValue={0} className="mt-1 w-full rounded border px-2 py-1.5" />
            </label>
            <label className="text-sm md:col-span-2">
              Reason (EN)
              <textarea name="reasonEn" required rows={2} className="mt-1 w-full rounded border px-2 py-1.5" />
            </label>
            <label className="text-sm md:col-span-2">
              Reason (TH)
              <textarea name="reasonTh" rows={2} className="mt-1 w-full rounded border px-2 py-1.5" />
            </label>
            <input type="hidden" name="active" value="true" />
            <div className="md:col-span-2">
              <Button type="submit">Save edge</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-3 py-2 font-medium">Key</th>
              <th className="px-3 py-2 font-medium">Trigger</th>
              <th className="px-3 py-2 font-medium">Target</th>
              <th className="px-3 py-2 font-medium">Score</th>
              <th className="px-3 py-2 font-medium">Active</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {edges.map((edge) => (
              <tr key={edge.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-3 py-2 font-mono text-xs">{edge.key}</td>
                <td className="px-3 py-2">{edge.triggerKey}</td>
                <td className="px-3 py-2">
                  {edge.targetKind}:{edge.targetKey}
                </td>
                <td className="px-3 py-2">{edge.score}</td>
                <td className="px-3 py-2">{edge.active ? "yes" : "no"}</td>
                <td className="px-3 py-2">
                  <form
                    action={async () => {
                      "use server";
                      await toggleRecommendationEdgeAction(edge.id, !edge.active);
                    }}
                  >
                    <Button type="submit" size="sm" variant="outline">
                      {edge.active ? "Disable" : "Enable"}
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
            {edges.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  No edges yet. Seed defaults or add one above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
