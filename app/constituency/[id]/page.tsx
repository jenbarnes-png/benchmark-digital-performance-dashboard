import { notFound } from "next/navigation";
import Link from "next/link";
import { getConstituencyDetail } from "@/lib/rankings";
import { getAdsForConstituency } from "@/lib/ads";
import { getCurrentSocialAccounts } from "@/lib/db";
import { getTiktokVideosForConstituency } from "@/lib/tiktokVideos";
import { getRecentChannelActivity, getChannelPostsForConstituency, getLeadgenSnapshot } from "@/lib/channelActivity";
import { RECENT_WINDOW_DAYS } from "@/lib/adRecency";
import { formatDateTime, formatPeriodLabel } from "@/lib/format";
import { tierForCount, untrackedItem, type DreamWeekItem } from "@/lib/dreamWeek";
import ScoreBar from "@/app/components/ScoreBar";
import ChangeIndicator from "@/app/components/ChangeIndicator";
import TiktokVideoCard from "@/app/components/TiktokVideoCard";
import ChannelPostCard from "@/app/components/ChannelPostCard";
import AdsList from "./AdsList";
import DreamWeekCard from "./DreamWeekCard";

const PREVIEW_COUNT = 3;

export default async function ConstituencyDetailPage({
  params,
  searchParams,
}: PageProps<"/constituency/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const period = typeof sp.period === "string" ? sp.period : undefined;

  const [detail, ads, socialAccounts, tiktokVideos, channelActivity, channelPosts, leadgen] = await Promise.all([
    getConstituencyDetail(id, period),
    getAdsForConstituency(id),
    getCurrentSocialAccounts(id),
    getTiktokVideosForConstituency(id, PREVIEW_COUNT),
    getRecentChannelActivity(id),
    getChannelPostsForConstituency(id, PREVIEW_COUNT),
    getLeadgenSnapshot(id),
  ]);
  if (!detail) notFound();

  const { constituency, current, targetPeriod } = detail;
  const tiktokAccount = socialAccounts.find((a) => a.platform === "tiktok");

  // The Dream Week checklist (see /scoring) — deliberately independent
  // of Overall score/Rankings. Items with no real data source yet are
  // marked "unknown" rather than guessed at.
  const organicItem: DreamWeekItem = channelActivity.hasAnyChannelData
    ? {
        key: "organic",
        title: "Organic Facebook & Instagram posts",
        target: "5 per week",
        ...tierForCount(channelActivity.organicPosts7d, 5),
        detail: `${channelActivity.organicPosts7d} in the last 7 days`,
      }
    : untrackedItem("organic", "Organic Facebook & Instagram posts", "5 per week", "No data yet");

  let tiktokWeekCount = 0;
  if (targetPeriod) {
    const rangeStart = new Date(targetPeriod.start);
    const rangeEnd = new Date(targetPeriod.end);
    rangeEnd.setUTCHours(23, 59, 59, 999);
    tiktokWeekCount = tiktokVideos.filter((v) => {
      const posted = new Date(v.postedAt);
      return posted >= rangeStart && posted <= rangeEnd;
    }).length;
  }
  const tiktokItem: DreamWeekItem = tiktokAccount
    ? {
        key: "tiktok-count",
        title: "TikToks posted",
        target: "2 per week",
        ...tierForCount(tiktokWeekCount, 2),
        detail: `${tiktokWeekCount} of 2 this week`,
      }
    : untrackedItem("tiktok-count", "TikToks posted", "2 per week", "No TikTok account matched yet");

  const selfieItem = untrackedItem(
    "selfie",
    "Localised selfie video (Facebook)",
    "1 per week",
    "Can't distinguish post type from a post count yet"
  );

  // The real "Lead Generation ad" signal from Hani's ads tracking takes
  // priority when available — the public Ad Library data behind
  // adSpend.recencyStatus can't tell campaign objective apart, so a
  // generically-active ad isn't proof of the specific Lead Gen ad this
  // benchmark asks for. Falls back to that general signal only when we
  // have no lead-gen data for this rep at all.
  let adItem: DreamWeekItem;
  if (leadgen.hasData) {
    const spend = leadgen.spendMtd ?? 0;
    if (leadgen.leadsActive && spend >= 50) {
      adItem = {
        key: "ads",
        title: "Always-on ad campaign (~£100/month)",
        target: "Active, roughly £100/month",
        tier: "green",
        points: 2,
        detail: `Lead Gen ad active, £${spend.toFixed(0)} spent this month`,
      };
    } else if (leadgen.leadsActive) {
      adItem = {
        key: "ads",
        title: "Always-on ad campaign (~£100/month)",
        target: "Active, roughly £100/month",
        tier: "amber",
        points: 1,
        detail: `Lead Gen ad active, £${spend.toFixed(0)} spent this month so far`,
      };
    } else {
      adItem = {
        key: "ads",
        title: "Always-on ad campaign (~£100/month)",
        target: "Active, roughly £100/month",
        tier: "red",
        points: 0,
        detail: "No Lead Generation ad active",
      };
    }
  } else {
    const AD_TIER = {
      active: { tier: "green" as const, points: 2, detail: "Ad running now (general activity, no Lead Gen data yet)" },
      recent: { tier: "amber" as const, points: 1, detail: "Ran recently, not running now" },
      stale: { tier: "red" as const, points: 0, detail: "No recent ad activity" },
      no_advertiser: { tier: "unknown" as const, points: 0, detail: "No advertiser matched yet" },
    };
    const adInfo = AD_TIER[current.adSpend.recencyStatus];
    adItem = {
      key: "ads",
      title: "Always-on ad campaign (~£100/month)",
      target: "Active, roughly £100/month",
      tier: adInfo.tier,
      points: adInfo.points,
      detail: adInfo.detail,
    };
  }

  const groupItem: DreamWeekItem = current.group.hasData
    ? {
        key: "group",
        title: "Facebook group posts",
        target: "3 per week",
        ...tierForCount(current.group.postCount, 3),
        detail: `${current.group.postCount} of 3 this week`,
      }
    : untrackedItem("group", "Facebook group posts", "3 per week", "No data yet");

  const friendlySpacesItem = untrackedItem(
    "friendly-spaces",
    "Building local friendly Facebook spaces",
    "Ongoing",
    "Target not yet defined"
  );
  const amplifiersItem = untrackedItem(
    "amplifiers",
    "Small group of amplifiers",
    "Ongoing",
    "Target not yet defined"
  );

  const newsletterItem: DreamWeekItem = channelActivity.hasNewsletterData
    ? {
        key: "newsletter",
        title: "Monthly email newsletter",
        target: "At least 1 per month",
        tier: channelActivity.newsletterInLast30Days ? "green" : "red",
        points: channelActivity.newsletterInLast30Days ? 2 : 0,
        detail: channelActivity.newsletterInLast30Days
          ? "Sent within the last 30 days"
          : "None sent in the last 30 days",
      }
    : untrackedItem("newsletter", "Monthly email newsletter", "At least 1 per month", "No data yet");

  const subscriberItem = untrackedItem(
    "subscribers",
    "Growing email subscribers & supporters",
    "Consistent growth",
    "No subscriber tracking yet"
  );

  const dreamWeekItems: DreamWeekItem[] = [
    organicItem,
    tiktokItem,
    selfieItem,
    adItem,
    groupItem,
    friendlySpacesItem,
    amplifiersItem,
    newsletterItem,
    subscriberItem,
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{constituency.name}</h1>
          <p className="mt-1 text-black/70 dark:text-white/70">
            {constituency.mp_or_candidate_name || "MP/candidate not yet known"}
            {current.tiktok.isBestPostWinner && (
              <span
                className="ml-1.5"
                title="Best-performing TikTok nationally this week"
                aria-label="Best-performing TikTok nationally this week"
              >
                🏅
              </span>
            )}{" "}
            · {constituency.region}
            {constituency.cohort && ` · ${constituency.cohort}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {socialAccounts
              .filter((a) => a.profile_url)
              .map((a) => (
                <a
                  key={a.platform}
                  href={a.profile_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {a.platform === "x" ? "X" : a.platform === "tiktok" ? "TikTok" : a.platform[0].toUpperCase() + a.platform.slice(1)}
                </a>
              ))}
          </div>
        </div>
        <div className="text-right text-sm text-black/50 dark:text-white/50">
          <p>{targetPeriod ? formatPeriodLabel(targetPeriod) : "No activity tracked yet"}</p>
          <p>Data last updated: {formatDateTime(detail.lastUpdated)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-sm font-medium text-black/70 dark:text-white/70">Overall score</p>
          <div className="mt-2">
            <ScoreBar points={detail.score} maxPoints={detail.scoreMaxPoints} />
          </div>
        </div>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-sm font-medium text-black/70 dark:text-white/70">
            Change vs previous period
          </p>
          <div className="mt-2">
            <ChangeIndicator delta={detail.change.delta} direction={detail.change.direction} />
          </div>
        </div>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-sm font-medium text-black/70 dark:text-white/70">National rank</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {detail.nationalRank}{" "}
            <span className="text-sm font-normal text-black/50 dark:text-white/50">
              of {detail.nationalCount}
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-sm font-medium text-black/70 dark:text-white/70">Regional rank</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {detail.regionalRank}{" "}
            <span className="text-sm font-normal text-black/50 dark:text-white/50">
              of {detail.regionalCount} in {constituency.region}
            </span>
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">The Dream Week checklist</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {targetPeriod ? `For ${formatPeriodLabel(targetPeriod)}` : "No activity tracked yet"} — a
          separate weekly view of the Dream Week benchmarks, not part of the overall score above.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dreamWeekItems.map((item) => (
            <DreamWeekCard key={item.key} item={item} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Currently running ads</h2>
          {ads.length > PREVIEW_COUNT && (
            <Link
              href={`/constituency/${id}/ads`}
              className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              See all {ads.length} ads →
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          From Meta&apos;s public Ad Library, active in the last {RECENT_WINDOW_DAYS} days, most recent first.
        </p>
        <div className="mt-4">
          <AdsList ads={ads.slice(0, PREVIEW_COUNT)} />
        </div>
      </div>

      {channelActivity.hasAnyChannelData && (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Facebook &amp; Instagram</h2>
            <Link
              href={`/constituency/${id}/posts`}
              className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              See all posts →
            </Link>
          </div>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Top posts in the last 30 days, ranked by reach.
          </p>
          {channelPosts.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {channelPosts.map((post) => (
                <ChannelPostCard key={post.id} post={post} showMp={false} />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-black/20 p-6 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
              No posts in the last 30 days.
            </p>
          )}
        </div>
      )}

      {tiktokAccount && (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">TikTok</h2>
            <div className="flex items-center gap-3">
              {tiktokAccount.follower_count !== null && (
                <span className="text-sm text-black/60 dark:text-white/60">
                  {tiktokAccount.follower_count.toLocaleString()} followers
                </span>
              )}
              <Link
                href={`/constituency/${id}/tiktok`}
                className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                See all videos →
              </Link>
            </div>
          </div>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Top videos in the last {RECENT_WINDOW_DAYS} days, ranked by views.
          </p>
          {tiktokVideos.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tiktokVideos.map((video) => (
                <TiktokVideoCard key={video.id} video={video} showMp={false} />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-black/20 p-6 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
              No videos posted in the last {RECENT_WINDOW_DAYS} days.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
