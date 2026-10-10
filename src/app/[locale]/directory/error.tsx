"use client";

export default function DirectoryError({ error }: { error: Error }) {
  const missingTable = /gov_office|does not exist|P2021/i.test(error.message);
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-xl font-semibold">The office directory could not be loaded.</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {missingTable
          ? "Apply the government office directory migration to the database, then reload this page."
          : "Refresh the page. If this continues, check the server logs."}
      </p>
    </main>
  );
}
