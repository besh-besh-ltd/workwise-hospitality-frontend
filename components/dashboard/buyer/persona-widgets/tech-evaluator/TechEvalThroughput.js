import React from "react";
import { Gauge } from "lucide-react";
import { getTechEvalThroughput } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import { SkeletonHeadline } from "@/components/dashboard/shared";
import ThroughputBody from "../ThroughputBody";

/** Your avg tech-eval turnaround this period vs last (▲/▼ delta + sparkline). */
const TechEvalThroughput = ({ filters }) => (
  <PersonaCard
    title="Tech-eval throughput"
    icon={Gauge}
    tooltip="Your average turnaround per tech-eval item — current period vs prior period."
    filters={filters}
    fetcher={getTechEvalThroughput}
    skeleton={<SkeletonHeadline withSpark={false} />}
    isEmpty={(d) =>
      !d || (d.current_period_avg == null && d.current_period_avg_hours == null)
    }
  >
    {(data) => <ThroughputBody data={data} />}
  </PersonaCard>
);

export default TechEvalThroughput;
