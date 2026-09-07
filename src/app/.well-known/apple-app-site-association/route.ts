import { NextResponse } from "next/server";

/**
 * iOS Universal Links association for the SiamEZ Expo app (`com.siamez.app`).
 * Set `APPLE_TEAM_ID` in production so devices can verify applinks.
 */
export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const appID = teamId ? `${teamId}.com.siamez.app` : "TEAMID.com.siamez.app";

  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID,
          paths: [
            "/freelancers",
            "/freelancers/*",
            "/en/freelancers",
            "/en/freelancers/*",
            "/th/freelancers",
            "/th/freelancers/*",
            "/checkout/*",
            "/en/checkout/*",
            "/th/checkout/*",
            "/services/*",
            "/en/services/*",
            "/th/services/*",
            "/book/*",
            "/en/book/*",
            "/th/book/*",
          ],
        },
      ],
    },
  };

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
