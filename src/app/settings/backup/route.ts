import { NextResponse } from "next/server";
import { createBackupPayload } from "@/lib/backup";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const workspace = await getCurrentWorkspace();
  const payload = await createBackupPayload(workspace);
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `familyextracts-backup-${date}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
