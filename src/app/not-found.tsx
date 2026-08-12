import Link from "next/link";
import { site } from "@/config/site";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-800">404</p>
          <h1 className="mt-3 text-3xl font-bold">Page not found</h1>
          <p className="mt-4 max-w-lg text-gray-600">
            This page does not exist. Return to SiamEZ to book a service or contact the team.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/en"
              className="inline-flex h-11 items-center rounded-lg bg-blue-800 px-5 text-sm font-semibold text-white"
            >
              Home
            </Link>
            <Link
              href="/en/services"
              className="inline-flex h-11 items-center rounded-lg border border-gray-300 px-5 text-sm font-semibold"
            >
              Services
            </Link>
            <Link
              href="/en/contact"
              className="inline-flex h-11 items-center rounded-lg border border-gray-300 px-5 text-sm font-semibold"
            >
              Contact
            </Link>
          </div>
          <p className="mt-8 text-sm text-gray-500">
            {site.email} · {site.phone}
          </p>
        </div>
      </body>
    </html>
  );
}
