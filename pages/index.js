// The marketing landing page (hotel-vendor.js) was retired alongside the
// CMS module. Historically the login UI was an AuthModal triggered from
// the Header on the marketing page; with the marketing page gone, "/"
// now renders the Login form directly.

import Head from "next/head";
import Login from "@/components/login";

export default function Home() {
  return (
    <>
      <Head>
        <title>Phileein Hospitality | Login</title>
      </Head>
      <Login />
    </>
  );
}
