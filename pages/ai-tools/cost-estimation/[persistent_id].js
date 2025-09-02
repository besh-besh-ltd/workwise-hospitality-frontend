import { getCostEstimationData } from "@/services/rfq";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import CostEstimationTable from "./CostEstimationTable";
import { aiToolsData } from "@/components/constants/aiToolsData";
import { HeroSection } from "@/components/ui/HeroSection";

const EstimationTable = () => {
  const router = useRouter();
  const { persistent_id } = router.query;
  const [estimationData, setEstimationData] = useState(null);

  const getEstimatesData = async () => {
    const data = await getCostEstimationData(persistent_id);
    if(data) setEstimationData(data);
  }

  useEffect(() => {
    if(persistent_id) getEstimatesData();
  }, [persistent_id])

  // noop

  return <>
      <Head>
        <title>{!estimationData ? 'Loading...' : `Cost Estimates for ${estimationData?.persistent?.file_name}`}</title>
        <meta name="description" content={`${estimationData?.persistent?.file_name}`} />
      </Head>

      <HeroSection
        title={aiToolsData.costEstimator.hero.title}
        subtitle={aiToolsData.costEstimator.hero.subtitle}
        layout="centered"
        size="small"
        textAlign="left"
        showVisual={false}
      />

      <section className="pt-2 pb-4">
        {estimationData ? (
          <CostEstimationTable
            fileName={estimationData.persistent.file_name}
            data={estimationData.estimates.items}
            persistence={estimationData.persistent}
          />
        ) : <div className="w-100 d-flex justify-content-center align-items-center mt-4">
          <p className="fs-5 fw-bold">Fetching your Cost Estimation...</p>
          </div>}
      </section>
  </>;
};

export default EstimationTable;
