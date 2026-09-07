import { NextResponse } from "next/server";

/**
 * Android App Links association for `com.siamez.app`.
 * Set `ANDROID_APP_SHA256_CERT_FINGERPRINTS` (comma-separated) from the
 * Play App Signing certificate so AutoVerify succeeds.
 */
export async function GET() {
  const fingerprints = (process.env.ANDROID_APP_SHA256_CERT_FINGERPRINTS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.siamez.app",
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
