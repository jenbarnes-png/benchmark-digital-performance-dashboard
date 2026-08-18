"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createConstituency,
  updateConstituency,
  deleteConstituency,
  isUniqueConstraintError,
  type ConstituencyInput,
} from "@/lib/db";

export type FormState = { error: string } | null;

function field(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function parseInput(formData: FormData): ConstituencyInput | { error: string } {
  const name = field(formData, "name");
  const region = field(formData, "region");

  if (!name) return { error: "Constituency name is required." };
  if (!region) return { error: "Region/nation is required." };

  return {
    name,
    region,
    mpOrCandidateName: field(formData, "mpOrCandidateName"),
    isPilot: formData.get("isPilot") === "on",
    facebookUrl: field(formData, "facebookUrl"),
    tiktokUrl: field(formData, "tiktokUrl"),
    instagramUrl: field(formData, "instagramUrl"),
    xUrl: field(formData, "xUrl"),
  };
}

export async function createConstituencyAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const input = parseInput(formData);
  if ("error" in input) return input;

  try {
    await createConstituency(input);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: `A constituency named "${input.name}" already exists.` };
    }
    throw error;
  }

  revalidatePath("/admin/constituencies");
  redirect("/admin/constituencies");
}

export async function updateConstituencyAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const input = parseInput(formData);
  if ("error" in input) return input;

  try {
    await updateConstituency(id, input);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: `A constituency named "${input.name}" already exists.` };
    }
    throw error;
  }

  revalidatePath("/admin/constituencies");
  redirect("/admin/constituencies");
}

export async function deleteConstituencyAction(id: string): Promise<void> {
  await deleteConstituency(id);
  revalidatePath("/admin/constituencies");
  redirect("/admin/constituencies");
}
