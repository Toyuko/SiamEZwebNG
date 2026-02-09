import { Card, CardContent } from "@/components/ui/card";

export default function AdminReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">Financial overview and reports.</p>
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-500">Reports placeholder.</p>
        </CardContent>
      </Card>
    </div>
  );
}
