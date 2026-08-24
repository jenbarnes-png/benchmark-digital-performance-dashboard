"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  submitSubscriberCountEntry,
  deleteSubscriberCountEntry,
  approveSubscriberCountEntry,
  rejectSubscriberCountEntry,
  type SubscriberCountInput,
} from "@/lib/subscriberCounts";
import { sendSubscriberApprovalEmail } from "@/lib/email";
import { listConstituencies } from "@/lib/db";
import { formatMonthLabel } from "@/lib/format";

export type FormState = { error: string } | null;

function monthEndFor(monthStart: string): string {
  const d = new Date(`${monthStart}T00:00:00Z`);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return end.toISOString().slice(0, 10);
}

function parseInput(formData: FormData): SubscriberCountInput | { error: string } {
  const constituencyId = String(formData.get("constituencyId") ?? "").trim();
  const monthStartRaw = String(formData.get("monthStart") ?? "").trim();

  if (!constituencyId) return { error: "Choose a constituency." };
  if (!monthStartRaw) return { error: "Choose a month." };
  const monthStart = `${monthStartRaw.slice(0, 7)}-01`;

  const raw = String(formData.get("subscriberCount") ?? "").trim();
  let subscriberCount: number | null = null;
  if (raw) {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      return { error: "Subscriber count must be a whole number, or left blank." };
    }
    subscriberCount = value;
  }

  return { constituencyId, monthStart, monthEnd: monthEndFor(monthStart), subscriberCount };
}

export async function submitSubscriberCountAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const input = parseInput(formData);
  if ("error" in input) return input;

  const entry = await submitSubscriberCountEntry(input);

  const constituencies = await listConstituencies();
  const constituencyName = constituencies.find((c) => c.id === input.constituencyId)?.name ?? "A constituency";
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  await sendSubscriberApprovalEmail({
    constituencyName,
    monthLabel: formatMonthLabel(input.monthStart),
    subscriberCount: input.subscriberCount ?? 0,
    reviewUrl: `${baseUrl}/admin/subscribers/approve/${entry.approvalToken}`,
  });

  revalidatePath("/admin/subscribers");
  redirect("/admin/subscribers");
}

export async function deleteSubscriberCountAction(constituencyId: string, monthStart: string): Promise<void> {
  await deleteSubscriberCountEntry(constituencyId, monthStart);
  revalidatePath("/admin/subscribers");
  redirect("/admin/subscribers");
}

export async function approveSubscriberEntryAction(token: string, formData: FormData): Promise<void> {
  const approvedBy = String(formData.get("approvedBy") ?? "").trim() || "unspecified";
  await approveSubscriberCountEntry(token, approvedBy);
  revalidatePath("/admin/subscribers");
  redirect(`/admin/subscribers/approve/${token}`);
}

export async function rejectSubscriberEntryAction(token: string, formData: FormData): Promise<void> {
  const approvedBy = String(formData.get("approvedBy") ?? "").trim() || "unspecified";
  await rejectSubscriberCountEntry(token, approvedBy);
  revalidatePath("/admin/subscribers");
  redirect(`/admin/subscribers/approve/${token}`);
}
