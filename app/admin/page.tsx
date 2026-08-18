import PagePlaceholder from "../components/PagePlaceholder";

export default function AdminPage() {
  return (
    <PagePlaceholder
      title="Admin / Data Entry"
      description="Where MPs' teams and admins enter or check data that can't be pulled in automatically, such as Facebook group activity."
      comingSoon={[
        "Manual data entry forms",
        "Review of recently submitted data",
        "Flags for seats with missing or incomplete data",
      ]}
    />
  );
}
