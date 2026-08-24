import { NextResponse } from "next/server";
import { syncTiktokFromSheet } from "@/lib/tiktokSync";
import { syncChannelDataFromSheet, aggregateWeeklyChannelActivity } from "@/lib/channelDataSync";
import { syncMetaAds } from "@/lib/adSpendSync";
import { aggregateRecentAdSpend } from "@/lib/adSpendAggregation";

// Vercel's default function timeout is 10s, nowhere near enough for
// three sequential external syncs (channel data alone upserts 1500+
// rows one at a time). 60s is the max Hobby-plan functions allow.
export const maxDuration = 60;

// Runs every sync Hani's warehouse feeds — the same thing
// scripts/sync_tiktok.mts, sync_channel_data.mts, and sync_meta_ads.mts
// each do by hand. Triggered on a schedule (see .github/workflows/
// sync-data.yml and vercel.json) rather than requiring someone to
// remember to re-run a script — that's what "permanently live" means
// in practice, on top of a token that doesn't expire.
//
// Each sync is wrapped independently so one failing (most likely: the
// Meta ad token expiring again) doesn't block the others — TikTok and
// channel data should keep updating even when ads can't.

function mondayOnOrBefore(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = mondayOnOrBefore(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const periodStart = weekStart.toISOString().slice(0, 10);
  const periodEnd = weekEnd.toISOString().slice(0, 10);

  const results: Record<string, unknown> = {};

  try {
    results.tiktok = await syncTiktokFromSheet();
  } catch (error) {
    results.tiktok = { error: String(error) };
  }

  try {
    const channelData = await syncChannelDataFromSheet();
    await aggregateWeeklyChannelActivity(periodStart, periodEnd);
    results.channelData = channelData;
  } catch (error) {
    results.channelData = { error: String(error) };
  }

  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    results.ads = { skipped: "META_ACCESS_TOKEN not set" };
  } else {
    try {
      const ads = await syncMetaAds(accessToken);
      await aggregateRecentAdSpend(periodStart, periodEnd);
      results.ads = ads;
    } catch (error) {
      results.ads = { error: String(error) };
    }
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), results });
}
