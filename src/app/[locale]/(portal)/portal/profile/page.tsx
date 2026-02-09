import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function PortalProfilePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">Manage your account details.</p>
      <Card className="mt-8 max-w-xl">
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Full name
            </label>
            <Input id="name" placeholder="Your name" />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <Input id="email" type="email" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium">
              Phone
            </label>
            <Input id="phone" type="tel" placeholder="+66 ..." />
          </div>
          <Button>Save changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
