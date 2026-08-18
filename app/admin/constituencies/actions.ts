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

function parseInput(formData: FormData): ConstituencyInput | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const mpOrCandidateNameRaw = String(formData.get("mpOrCandidateName") ?? "").trim();

  if (!name) return { error: "Constituency name is required." };
  if (!region) return { error: "Region/nation is required." };

  return {
    name,
    region,
    mpOrCandidateName: mpOrCandidateNameRaw || null,
    isPilot: formData.get("isPilot") === "on",
  };
}

export async function createConstituencyAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const input = parseInput(formData);
  if ("error" in input) return input;

  try {
    createConstituency(input);
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
    updateConstituency(id, input);
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
  deleteConstituency(id);
  revalidatePath("/admin/constituencies");
  redirect("/admin/constituencies");
}
