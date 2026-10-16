"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertStaff, isClientUser } from "@/lib/beaconAuth";
import {
  submitAmplifierEntry,
  deleteAmplifierEntry,
  approveAmplifierEntry,
  rejectAmplifierEntry,
  type AmplifierInput,
} from "@/lib/amplifierGroups";
import { sendAmplifierApprovalEmail } from "@/lib/email";
import { formatPeriodLabel } from "@/lib/format";
import { listConstituencies } from "@/lib/db";

export type FormState = { error: string } | null;

// Kept under Vercel's 4.5MB request limit, with room for the other form fields.
const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function wholeNumber(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

async function parseInput(formData: FormData): Promise<AmplifierInput | { error: string }> {
  const constituencyId = String(formData.get("constituencyId") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "").trim();
  if (!constituencyId) return { error: "Choose a constituency." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) return { error: "Choose a week." };
  if (new Date(`${periodStart}T00:00:00Z`).getUTCDay() !== 1) return { error: "The week must start on a Monday." };

  const memberCount = wholeNumber(formData, "memberCount");
  if (memberCount === null) return { error: "Enter how many people are in the group (a whole number, 0 or more)." };
  const postCount = wholeNumber(formData, "postCount");
  if (postCount === null) return { error: "Enter how many posts went into the group this week (a whole number, 0 or more)." };

  const file = formData.get("screenshot");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Add a screenshot of the group showing the members and this week's posts. It's needed so the report can be approved." };
  }
  if (!file.type.startsWith("image/")) return { error: "The screenshot must be an image file (JPG or PNG)." };
  if (file.size > MAX_SCREENSHOT_BYTES) return { error: "The screenshot is too big. Please use one under 4MB (a cropped screenshot is usually fine)." };

  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500) || null;
  return {
    constituencyId,
    periodStart,
    periodEnd: addDays(periodStart, 6),
    memberCount,
    postCount,
    notes,
    screenshot: { data: Buffer.from(await file.arrayBuffer()), contentType: file.type },
  };
}

export async function submitAmplifierAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const input = await parseInput(formData);
  if ("error" in input) return input;

  const entry = await submitAmplifierEntry(input);

  const constituencies = await listConstituencies();
  const constituencyName = constituencies.find((c) => c.id === input.constituencyId)?.name ?? "A constituency";
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  await sendAmplifierApprovalEmail({
    constituencyName,
    periodLabel: formatPeriodLabel({ start: input.periodStart, end: input.periodEnd }),
    memberCount: input.memberCount,
    postCount: input.postCount,
    reviewUrl: `${baseUrl}/admin/amplifiers/approve/${entry.approvalToken}`,
  });

  revalidatePath("/admin/amplifiers");
  // Client accounts can't open the review queue, so send them back to the form with a confirmation.
  redirect((await isClientUser()) ? "/admin/amplifiers/new?submitted=1" : "/admin/amplifiers");
}

export async function deleteAmplifierAction(id: string): Promise<void> {
  await assertStaff();
  await deleteAmplifierEntry(id);
  revalidatePath("/admin/amplifiers");
  redirect("/admin/amplifiers");
}

export async function approveAmplifierAction(token: string, formData: FormData): Promise<void> {
  await assertStaff();
  const approvedBy = String(formData.get("approvedBy") ?? "").trim() || "unspecified";
  const entry = await approveAmplifierEntry(token, approvedBy);
  revalidatePath("/admin/amplifiers");
  if (entry) revalidatePath(`/constituency/${entry.constituencyId}`);
  redirect(`/admin/amplifiers/approve/${token}`);
}

export async function rejectAmplifierAction(token: string, formData: FormData): Promise<void> {
  await assertStaff();
  const approvedBy = String(formData.get("approvedBy") ?? "").trim() || "unspecified";
  await rejectAmplifierEntry(token, approvedBy);
  revalidatePath("/admin/amplifiers");
  redirect(`/admin/amplifiers/approve/${token}`);
}
