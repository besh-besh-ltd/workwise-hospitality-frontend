import Head from "next/head";
import { useRouter } from "next/router";
import { AuthGuard } from "@/utils/authGuard";
import ArcReleaseWizard from "@/components/dashboard/buyer/editRFQ/ArcReleaseWizard";
import s from "./new.module.scss";

// Thin page wrapper around <ArcReleaseWizard>. The wizard now lives in
// components/ so it can be mounted both:
//   - as a modal from AddProductModal (preferred path — no context loss)
//   - as a full page via this route (kept for deep links / direct URL
//     access / backwards compatibility with existing emails or saved
//     bookmarks).
//
// All wizard logic + state lives in the component; this file just
// provides the page chrome and the navigation glue.

const ArcReleaseNewPage = () => {
  const router = useRouter();
  const { arc_id, arc_item_id, hotel_id } = router.query;

  if (!router.isReady) return null;

  return (
    <AuthGuard>
      <Head>
        <title>Create Release · ARC</title>
      </Head>
      <main className={s.page}>
        <ArcReleaseWizard
          arc_id={arc_id}
          arc_item_id={arc_item_id}
          hotel_id={hotel_id}
          onClose={() => router.back()}
          onSuccess={() => router.replace("/dashboard/buyer/purchase-order/contracted")}
          variant="page"
        />
      </main>
    </AuthGuard>
  );
};

export default ArcReleaseNewPage;
