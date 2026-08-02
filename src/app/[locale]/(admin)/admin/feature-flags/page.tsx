import { listFeatureFlags } from "@/lib/feature-flags";
import { FeatureFlagToggle } from "./FeatureFlagToggle";

export default async function FeatureFlagsPage() {
  const flags = await listFeatureFlags();
  return <div><h1 className="text-2xl font-bold">Feature flags</h1><p className="mt-1 text-gray-600 dark:text-gray-400">Enable experimental platform surfaces without a deployment.</p><ul className="mt-6 divide-y rounded-lg border border-gray-200 dark:border-gray-800">{flags.map((flag) => <li className="flex items-center justify-between gap-4 p-4" key={flag.key}><div><p className="font-medium">{flag.key}</p>{flag.description ? <p className="text-sm text-gray-500">{flag.description}</p> : null}</div><FeatureFlagToggle flagKey={flag.key} initialEnabled={flag.enabled} /></li>)}</ul></div>;
}
