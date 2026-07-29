import { useRouter } from "next/router";
import MrAllPage from "@/components/dashboard/material-requisitions/MrAllPage";

export default function AllMrs() {
  // Honor a ?tab= deep-link (e.g. the dashboard "Pending approval" card →
  // ?tab=for_me). MrAllPage validates the preset against its TABS and safely
  // falls back to "all" for anything unknown.
  const { query } = useRouter();
  const preset = typeof query.tab === "string" ? query.tab : "all";
  return <MrAllPage filterPreset={preset} />;
}
