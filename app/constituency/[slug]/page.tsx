import PagePlaceholder from "../../components/PagePlaceholder";

export default async function ConstituencyDetailPage({
  params,
}: PageProps<"/constituency/[slug]">) {
  const { slug } = await params;

  return (
    <PagePlaceholder
      title={`Constituency Detail: ${slug}`}
      description="Ad spend, organic posting, group activity and newsletter sending for a single constituency, tracked over time. In normal use you'll arrive here by clicking a seat on the Dashboard or Rankings page."
      comingSoon={[
        "Ad spend vs. target, by platform",
        "Organic posting activity over time",
        "Facebook group activity",
        "Newsletter send frequency",
        "Comparison to similar seats and best-practice benchmarks",
      ]}
    />
  );
}
