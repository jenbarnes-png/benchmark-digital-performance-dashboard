import { NextResponse } from "next/server";
import { getAmplifierScreenshot } from "@/lib/amplifierGroups";

// Staff only: the proxy requires a staff or admin sign-in for everything under /admin except the two client forms.
export async function GET(_request: Request, { params }: RouteContext<"/admin/amplifiers/screenshot/[id]">) {
  const { id } = await params;
  const screenshot = await getAmplifierScreenshot(id);
  if (!screenshot) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(screenshot.data), {
    headers: { "Content-Type": screenshot.contentType, "Cache-Control": "private, max-age=3600" },
  });
}
