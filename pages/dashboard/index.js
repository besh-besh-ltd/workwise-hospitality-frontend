import React from 'react';
import DashboardPage from "@/components/dashboard";
import Head from "next/head";

const Dashboard = () => {
  return (
    <div>
      <Head>
                <title>Workwise | Dashboard</title>
            </Head>
        <DashboardPage/>
    </div>
  )
}

export default Dashboard