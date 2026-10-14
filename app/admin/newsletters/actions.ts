"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/beaconAuth";
import { addNewsletterEntry, deleteManualNewsletterEntry } from "@/lib/newsletterManual";

export async function addNewsletterAction(formData: FormData): Promise<void> {
  await assertStaff();
  const constituencyId = String(formData.get("constituencyId") ?? "").trim();
  const sentOn = String(formData.get("sentOn") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim() || null;

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(sentOn) && !Number.isNaN(new Date(sentOn).getTime());
  if (!constituencyId || !validDate) redirect("/admin/newsletters?error=Choose+an+MP+and+a+date");
  if (new Date(sentOn) > new Date()) redirect("/admin/newsletters?error=That+date+is+in+the+future");

  const ok = await addNewsletterEntry({ constituencyId, sentOn, subject });
  if (!ok) redirect("/admin/newsletters?error=That+constituency+has+no+current+MP");

  revalidatePath("/admin/newsletters");
  revalidatePath("/rankings");
  redirect("/admin/newsletters?saved=1");
}

export async function deleteNewsletterAction(id: string): Promise<void> {
  await assertStaff();
  await deleteManualNewsletterEntry(id);
  revalidatePath("/admin/newsletters");
  revalidatePath("/rankings");
  redirect("/admin/newsletters");
}
