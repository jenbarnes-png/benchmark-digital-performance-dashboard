import { getConstituencyAdStatuses } from "@/lib/hexmapData";
import HexMap from "./components/HexMap";

export default async function NationalDashboardPage() {
  const statuses = await getConstituencyAdStatuses();
  const trackedCount = statuses.size;
  const activeCount = Array.from(statuses.values()).filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">National Dashboard</h1>
        <p className="mt-2 max-w-2xl text-black/70 dark:text-white/70">
          All 650 UK constituencies. {trackedCount} currently tracked
          {activeCount > 0 ? `, ${activeCount} with ads running right now` : ""}. Click any seat
          for its full detail.
        </p>
      </div>

      <HexMap statuses={statuses} />
    </div>
  );
}
