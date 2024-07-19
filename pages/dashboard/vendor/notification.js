import React from "react";
import NotificationPage from "@/components/dashboard/vendor/notification";
import Head from "next/head";
const Notification = () => {
  return (
    <>
      <Head>
        <title>Workwise | Notifications</title>
      </Head>
      <NotificationPage />
    </>
  );
};

export default Notification;
