import { NextResponse } from "next/server";
import { getFacebookGroupScreenshot } from "@/lib/facebookGroupActivity";

export async function GET(_request: Request, { params }: RouteContext<"/admin/facebook-group/screenshot/[id]">) {
  const { id } = await params;
  const screenshot = await getFacebookGroupScreenshot(id);
  if (!screenshot) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(screenshot.data), {
    headers: {
      "Content-Type": screenshot.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
