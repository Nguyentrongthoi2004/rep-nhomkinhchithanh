import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Deprecated. Use POST /api/auth/ensure-profile and /api/admin/users." },
    { status: 410 }
  );
}
