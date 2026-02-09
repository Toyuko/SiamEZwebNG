import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">System and team settings.</p>
      <Card className="mt-8 max-w-xl">
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Settings form placeholder.</p>
        </CardContent>
      </Card>
    </div>
  );
}
