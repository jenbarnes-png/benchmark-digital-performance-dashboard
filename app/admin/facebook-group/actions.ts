"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  submitFacebookGroupEntry,
  deleteFacebookGroupEntry,
  approveFacebookGroupEntry,
  rejectFacebookGroupEntry,
  type FacebookGroupInput,
} from "@/lib/facebookGroupActivity";
import { sendApprovalEmail } from "@/lib/email";
import { formatPeriodLabel } from "@/lib/format";
import { listConstituencies } from "@/lib/db";

export type FormState = { error: string } | null;

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseCount(formData: FormData, key: string): number | null | "invalid" {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) return "invalid";
  return value;
}

async function parseScreenshot(
  formData: FormData
): Promise<{ data: Buffer; contentType: string } | null | "invalid"> {
  const file = formData.get("screenshot");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) return "invalid";
  if (file.size > MAX_SCREENSHOT_BYTES) return "invalid";
  return { data: Buffer.from(await file.arrayBuffer()), contentType: file.type };
}

async function parseInput(formData: FormData): Promise<FacebookGroupInput | { error: string }> {
  const constituencyId = String(formData.get("constituencyId") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "").trim();

  if (!constituencyId) return { error: "Choose a constituency." };
  if (!periodStart) return { error: "Choose a week." };

  const postCount = parseCount(formData, "postCount");
  if (postCount === "invalid") {
    return { error: "Post count must be a whole number, or left blank." };
  }

  const postUrl = String(formData.get("postUrl") ?? "").trim() || null;

  const screenshot = await parseScreenshot(formData);
  if (screenshot === "invalid") {
    return { error: "Screenshot must be an image file under 5MB." };
  }

  return { constituencyId, periodStart, periodEnd: addDays(periodStart, 6), postCount, postUrl, screenshot };
}

export async function submitFacebookGroupAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const input = await parseInput(formData);
  if ("error" in input) return input;

  const entry = await submitFacebookGroupEntry(input);

  const constituencies = await listConstituencies();
  const constituencyName = constituencies.find((c) => c.id === input.constituencyId)?.name ?? "A constituency";
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  await sendApprovalEmail({
    constituencyName,
    periodLabel: formatPeriodLabel({ start: input.periodStart, end: input.periodEnd }),
    postCount: input.postCount ?? 0,
    reviewUrl: `${baseUrl}/admin/facebook-group/approve/${entry.approvalToken}`,
  });

  revalidatePath("/admin/facebook-group");
  redirect("/admin/facebook-group");
}

export async function deleteFacebookGroupAction(constituencyId: string, periodStart: string): Promise<void> {
  await deleteFacebookGroupEntry(constituencyId, periodStart);
  revalidatePath("/admin/facebook-group");
  revalidatePath(`/constituency/${constituencyId}`);
  redirect("/admin/facebook-group");
}

export async function approveEntryAction(token: string, formData: FormData): Promise<void> {
  const approvedBy = String(formData.get("approvedBy") ?? "").trim() || "unspecified";
  const entry = await approveFacebookGroupEntry(token, approvedBy);
  revalidatePath("/admin/facebook-group");
  if (entry) revalidatePath(`/constituency/${entry.constituencyId}`);
  redirect(`/admin/facebook-group/approve/${token}`);
}

export async function rejectEntryAction(token: string, formData: FormData): Promise<void> {
  const approvedBy = String(formData.get("approvedBy") ?? "").trim() || "unspecified";
  await rejectFacebookGroupEntry(token, approvedBy);
  revalidatePath("/admin/facebook-group");
  redirect(`/admin/facebook-group/approve/${token}`);
}
