import PagePlaceholder from "../components/PagePlaceholder";

export default function RankingsPage() {
  return (
    <PagePlaceholder
      title="Rankings"
      description="The same data as the National Dashboard, as a sortable table. Compare seats directly and produce league tables by region, cohort, or metric."
      comingSoon={[
        "Sortable table of all constituencies",
        "Filter by region and cohort",
        "League tables per metric",
      ]}
    />
  );
}
