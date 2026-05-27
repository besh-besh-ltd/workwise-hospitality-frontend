import React from "react";
import { Gauge } from "lucide-react";
import { getTechApprovalThroughput } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import ThroughputBody from "../ThroughputBody";

const TechApprovalThroughput = ({ filters }) => (
  <PersonaCard
    title="Tech-approval throughput"
    icon={Gauge}
    tooltip="Your average tech-approval turnaround — current period vs prior period."
    filters={filters}
    fetcher={getTechApprovalThroughput}
    isEmpty={(d) =>
      !d || (d.current_period_avg == null && d.current_period_avg_hours == null)
    }
  >
    {(data) => <ThroughputBody data={data} />}
  </PersonaCard>
);

export default TechApprovalThroughput;
