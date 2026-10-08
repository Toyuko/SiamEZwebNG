import type { Metadata } from "next";
import { headers } from "next/headers";
import { listPublicIntakeOptions } from "@/data-access/job-intake";
import { getJobIntakeMemory } from "@/data-access/job-intake-memory";
import { JobIntakeForm } from "@/components/admin/jobs/JobIntakeForm";
import {
  formatJobIntakeMemoryBrief,
  isJobIntakeMemoryToken,
  jobIntakeMemoryJson,
  jobIntakeMemoryPath,
  originFromHeaders,
} from "@/lib/jobs/intake-memory";
import { noindexRobots } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "Saved job",
    robots: noindexRobots,
    alternates: isJobIntakeMemoryToken(token)
      ? { types: { "application/json": `/api/jobs/saved/${token}` } }
      : undefined,
  };
}

export default async function SavedJobPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isJobIntakeMemoryToken(token)) {
    return <MissingLink />;
  }

  const saved = await getJobIntakeMemory(token);
  if (!saved) return <MissingLink />;

  const { services, staff } = await listPublicIntakeOptions();
  const url = `${originFromHeaders(await headers())}${jobIntakeMemoryPath(saved.token)}`;
  const brief = formatJobIntakeMemoryBrief({
    url,
    updatedAt: saved.updatedAt,
    caseId: saved.caseId,
    memory: saved.memory,
    details: saved.details,
    services,
    staff,
  });
  const payload = jobIntakeMemoryJson({
    kind: "siamez-job-intake-memory",
    url,
    updatedAt: saved.updatedAt.toISOString(),
    caseId: saved.caseId,
    memory: saved.memory,
    details: saved.details,
    brief,
  });

  return (
    <>
      <script id="siamez-job-intake-memory" type="application/json" dangerouslySetInnerHTML={{ __html: payload }} />
      <details className="mx-auto mb-4 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200">
          Reference saved with this URL
        </summary>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">{brief}</pre>
      </details>
      <JobIntakeForm
        mode="create"
        access="link"
        services={services}
        staff={staff}
        initial={saved.details}
        memoryToken={saved.token}
        initialMemory={saved.memory}
        initialCustomerChoice={saved.details.customerChoice}
        initialExistingCustomerId={saved.details.existingCustomerId}
        linkedCaseId={saved.caseId}
        snapshotOnly={Boolean(saved.caseId)}
      />
    </>
  );
}

function MissingLink() {
  return (
    <div className="mx-auto w-full max-w-lg py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Saved link not found</h1>
      <p className="mt-2 text-base text-gray-600 dark:text-gray-300">
        This job link does not match a saved draft. Check the URL and try again.
      </p>
    </div>
  );
}
