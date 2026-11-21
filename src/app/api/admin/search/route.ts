import { NextResponse } from "next/server";
import { searchAdmin } from "@/lib/admin/search";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    if (q.trim().length < 2) {
      return NextResponse.json({ groups: [] });
    }

    const groups = await searchAdmin(q);
    return NextResponse.json({ groups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/search]", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
