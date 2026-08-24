"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { upsertOrganicPostEntry, deleteOrganicPostEntry, type OrganicPostInput } from "@/lib/organicPosts";

export type FormState = { error: string } | null;

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

function parseInput(formData: FormData): OrganicPostInput | { error: string } {
  const constituencyId = String(formData.get("constituencyId") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "").trim();

  if (!constituencyId) return { error: "Choose a constituency." };
  if (!periodStart) return { error: "Choose a week." };

  const facebookPostCount = parseCount(formData, "facebookPostCount");
  if (facebookPostCount === "invalid") {
    return { error: "Facebook post count must be a whole number, or left blank." };
  }
  const instagramPostCount = parseCount(formData, "instagramPostCount");
  if (instagramPostCount === "invalid") {
    return { error: "Instagram post count must be a whole number, or left blank." };
  }

  return {
    constituencyId,
    periodStart,
    periodEnd: addDays(periodStart, 6),
    facebookPostCount,
    instagramPostCount,
  };
}

export async function saveOrganicPostsAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const input = parseInput(formData);
  if ("error" in input) return input;

  await upsertOrganicPostEntry(input);

  revalidatePath("/admin/organic-posts");
  revalidatePath(`/constituency/${input.constituencyId}`);
  redirect("/admin/organic-posts");
}

export async function deleteOrganicPostsAction(constituencyId: string, periodStart: string): Promise<void> {
  await deleteOrganicPostEntry(constituencyId, periodStart);
  revalidatePath("/admin/organic-posts");
  revalidatePath(`/constituency/${constituencyId}`);
  redirect("/admin/organic-posts");
}
