// Read-only client for the Crete post store (Elasticsearch). Replaces the
// Brandwatch/Exolyt-fed Google Sheets as the only source of Facebook,
// Instagram and TikTok activity. ES_URL / ES_API_KEY come from the
// environment (.env.local locally, Vercel and GitHub secrets in production).

export type CretePlatform = "facebook" | "instagram" | "tiktok";

export const CRETE_INDEX: Record<CretePlatform, string> = {
  facebook: "crete-fb-pages",
  instagram: "crete-ig-posts",
  tiktok: "crete-tt-posts",
};

export type CretePost = {
  platform: CretePlatform;
  postUrl: string;
  postId: string | null;
  postedAt: Date;
  /** Reel / Post / Carousel / Image / Video, as reported by the collector. */
  type: string | null;
  text: string | null;
  likes: number;
  comments: number;
  shares: number;
  /** Only present for TikTok and for some Facebook/Instagram video posts. */
  views: number | null;
  accountUrl: string;
  accountName: string | null;
  accountNickname: string | null;
  followers: number | null;
  scrapedAt: Date | null;
};

type RawDoc = {
  id?: string;
  post?: { id?: string; url?: string };
  url?: string;
  timestamp?: string;
  type?: string | null;
  body?: string | null;
  description?: string | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  views?: number | null;
  user?: { url?: string; name?: string | null; nickname?: string | null; members?: number | null; followers?: number | null };
  group?: { members?: number | null };
  scraped_at?: string | null;
};

const SOURCE_FIELDS = [
  "id",
  "post.id",
  "post.url",
  "url",
  "timestamp",
  "type",
  "body",
  "description",
  "likes",
  "comments",
  "shares",
  "views",
  "user.url",
  "user.name",
  "user.nickname",
  "user.members",
  "user.followers",
  "group.members",
  "scraped_at",
];

function config() {
  const url = process.env.ES_URL;
  const key = process.env.ES_API_KEY;
  if (!url || !key) throw new Error("ES_URL / ES_API_KEY are not set");
  return { url: url.replace(/\/$/, ""), key };
}

async function es(path: string, body: unknown): Promise<any> {
  const { url, key } = config();
  const res = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { Authorization: `ApiKey ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Crete ${path} failed: HTTP ${res.status} ${text.slice(0, 300)}`);
  }
  return res.json();
}

// TikTok timestamps come back without a timezone ("2026-10-14T12:58:42").
// They are UTC like the rest, so say so rather than letting Date guess local time.
function parseTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const d = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toPost(platform: CretePlatform, doc: RawDoc): CretePost | null {
  const postedAt = parseTime(doc.timestamp);
  const postUrl = doc.post?.url ?? doc.url;
  const accountUrl = doc.user?.url;
  if (!postedAt || !postUrl || !accountUrl) return null;

  const followers =
    platform === "tiktok"
      ? (doc.user?.followers ?? null)
      : platform === "instagram"
        ? (doc.user?.members ?? null)
        : (doc.group?.members ?? doc.user?.members ?? null);

  return {
    platform,
    postUrl,
    postId: doc.post?.id ?? doc.id ?? null,
    postedAt,
    type: doc.type ?? null,
    text: doc.body ?? doc.description ?? null,
    likes: doc.likes ?? 0,
    comments: doc.comments ?? 0,
    shares: doc.shares ?? 0,
    views: doc.views ?? null,
    accountUrl,
    accountName: doc.user?.name ?? null,
    accountNickname: doc.user?.nickname ?? null,
    followers,
    scrapedAt: parseTime(doc.scraped_at),
  };
}

/** Every post on one platform published on or after `since`, paged with the scroll API. */
export async function fetchCretePosts(platform: CretePlatform, since: Date): Promise<CretePost[]> {
  const index = CRETE_INDEX[platform];
  const posts: CretePost[] = [];

  let page = await es(`/${index}/_search?scroll=2m`, {
    size: 1000,
    sort: ["_doc"],
    _source: SOURCE_FIELDS,
    query: { range: { timestamp: { gte: since.toISOString() } } },
  });

  while (page.hits.hits.length > 0) {
    for (const hit of page.hits.hits) {
      const post = toPost(platform, hit._source as RawDoc);
      if (post) posts.push(post);
    }
    if (!page._scroll_id) break;
    page = await es(`/_search/scroll`, { scroll: "2m", scroll_id: page._scroll_id });
  }

  return posts;
}

/** Stable per-platform key for an account's profile URL, so URLs written differently still match. */
export function accountKey(platform: CretePlatform, rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  let url: URL;
  try {
    url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
  } catch {
    return null;
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  if (platform === "tiktok") {
    const at = segments.find((s) => s.startsWith("@"));
    return (at ?? segments[0]).replace(/^@/, "").toLowerCase();
  }
  if (platform === "facebook") {
    if (segments[0].toLowerCase() === "profile.php") {
      const id = url.searchParams.get("id");
      return id ? `id:${id}` : null;
    }
    if (["pages", "people"].includes(segments[0].toLowerCase())) return segments[segments.length - 1].toLowerCase();
  }
  return segments[0].toLowerCase();
}

/** Per-index headline numbers, for monitoring: how much is stored and how recently it was collected. */
export async function creteHealth(): Promise<
  Record<CretePlatform, { posts: number; accounts: number; earliestPost: string | null; latestPost: string | null; lastScraped: string | null }>
> {
  const out = {} as Awaited<ReturnType<typeof creteHealth>>;
  for (const platform of ["facebook", "instagram", "tiktok"] as CretePlatform[]) {
    const r = await es(`/${CRETE_INDEX[platform]}/_search`, {
      size: 0,
      track_total_hits: true,
      aggs: {
        first: { min: { field: "timestamp" } },
        last: { max: { field: "timestamp" } },
        scraped: { max: { field: "scraped_at" } },
        accounts: { cardinality: { field: "user.url.keyword" } },
      },
    });
    out[platform] = {
      posts: r.hits.total.value,
      accounts: r.aggregations.accounts.value,
      earliestPost: r.aggregations.first.value_as_string ?? null,
      latestPost: r.aggregations.last.value_as_string ?? null,
      lastScraped: r.aggregations.scraped.value_as_string ?? null,
    };
  }
  return out;
}
