import { NextResponse } from "next/server";
import { recordReply } from "@/lib/memory";

// Small, single-purpose endpoint: flips whether the prospect's most recent
// touch got a reply. Split out from /api/generate on purpose -- "the user
// told us what happened" (a memory write) and "write a new email" (a model
// call) are different concerns, and the dashboard's "Simulate reply" button
// does both in sequence: record here, then POST /api/generate again so the
// next email is written against the updated history.
export async function POST(request: Request) {
  let body: { name?: string; replied?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body.name !== "string" || body.name.trim().length === 0 || typeof body.replied !== "boolean") {
    return NextResponse.json({ error: "Provide { name: string, replied: boolean }." }, { status: 400 });
  }

  const updated = await recordReply(body.name, body.replied);
  if (!updated) {
    return NextResponse.json(
      { error: "No touch history found for this prospect yet — generate an email first." },
      { status: 404 }
    );
  }

  return NextResponse.json({ prospect: updated });
}
