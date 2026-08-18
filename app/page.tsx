import PagePlaceholder from "./components/PagePlaceholder";

export default function NationalDashboardPage() {
  return (
    <PagePlaceholder
      title="National Dashboard"
      description="The national hexmap of all 650 UK constituencies, shaded by activity or performance. Click through from any seat to its detail page."
      comingSoon={[
        "Hexmap of all constituencies",
        "Metric selector (ad spend, organic posting, group activity, newsletters)",
        "Click-through to individual seat detail",
      ]}
    />
  );
}
