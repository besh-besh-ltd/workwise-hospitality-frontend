import React from "react";
import { Gauge } from "lucide-react";
import { getCommercialApprovalThroughput } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import ThroughputBody from "../ThroughputBody";

const CommercialApprovalThroughput = ({ filters }) => (
  <PersonaCard
    title="Commercial-approval throughput"
    icon={Gauge}
    tooltip="Your average commercial-approval turnaround — current period vs prior period."
    filters={filters}
    fetcher={getCommercialApprovalThroughput}
    isEmpty={(d) =>
      !d || (d.current_period_avg == null && d.current_period_avg_hours == null)
    }
  >
    {(data) => <ThroughputBody data={data} />}
  </PersonaCard>
);

export default CommercialApprovalThroughput;
