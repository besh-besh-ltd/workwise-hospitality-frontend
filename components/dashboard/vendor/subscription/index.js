import React, { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { setUserProfile } from "@/redux/slice";
import { getProfile } from "@/services/Auth";
import {
  modifySubscription,
  renewHospitalitySubscription,
  extendSubscription
} from "@/services/subscription";
import FullLoader from "@/components/shared/FullLoader";
import useSubscriptionData from "./hooks/useSubscriptionData";
import useRazorpayPayment from "./hooks/useRazorpayPayment";
import HeroStatusCard from "./HeroStatusCard";
import CategoriesPanel from "./CategoriesPanel";
import HotelsPanel from "./HotelsPanel";
import PaymentHistorySection from "./PaymentHistorySection";
import EditSubscriptionDrawer from "./EditSubscriptionDrawer";
import ModificationConfirmModal from "./ModificationConfirmModal";
import ModificationSuccessModal from "./ModificationSuccessModal";
import SubscriptionErrorModal from "./SubscriptionErrorModal";
import EmptyState from "./EmptyState";
import styles from "./Subscription.module.css";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "items", label: "Manage Subscription" }
];

const SubscriptionPage = () => {
  const dispatch = useDispatch();
  const { data, loading, refresh } = useSubscriptionData();
  const [activeTab, setActiveTab] = useState("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(null);
  const [errorModal, setErrorModal] = useState(false);

  const refreshAll = useCallback(async () => {
    try {
      const profileRes = await getProfile();
      if (profileRes?.data) {
        dispatch(setUserProfile(profileRes.data));
      }
    } catch (_) {}
    await refresh();
  }, [dispatch, refresh]);

  const handlePaymentSuccess = useCallback(
    async (verifyData) => {
      setConfirmLoading(false);
      setConfirmData(null);
      setDrawerOpen(false);
      if (verifyData?.fallback) {
        setErrorModal(true);
      } else {
        setSuccessModal(verifyData);
      }
    },
    []
  );

  const handlePaymentCancel = useCallback(() => {
    setConfirmLoading(false);
  }, []);

  const { openPayment, inProgress: paymentInProgress } = useRazorpayPayment({
    onSuccess: handlePaymentSuccess,
    onCancel: handlePaymentCancel
  });

  const handleSuccessClose = async () => {
    setSuccessModal(null);
    await refreshAll();
  };

  const handleDrawerSubmit = ({ target_categories, target_subcategories, target_hotels, preview }) => {
    setConfirmData({ target_categories, target_subcategories, target_hotels, preview });
  };

  const handleConfirm = async () => {
    if (!confirmData) return;
    setConfirmLoading(true);

    const { target_categories, target_subcategories, target_hotels, preview } = confirmData;
    const hasRemovals =
      (preview.diff?.removed_categories?.length || 0) +
      (preview.diff?.removed_hotels?.length || 0) > 0;

    try {
      const res = await modifySubscription({
        target_categories,
        target_subcategories,
        target_hotels,
        confirm_removals: hasRemovals ? true : undefined
      });

      if (res?.status === 1 && res?.data) {
        if (res.data.requires_payment) {
          await openPayment(res.data);
        } else {
          setConfirmLoading(false);
          setConfirmData(null);
          setDrawerOpen(false);
          setSuccessModal({
            is_modification: true,
            amount: 0,
            expiry_date: res.data.expiry_date,
            added_categories: res.data.summary?.added_categories?.map((c) => c.name) || [],
            removed_categories: res.data.summary?.removed_categories?.map((c) => c.name) || [],
            ...res.data
          });
        }
      } else {
        setConfirmLoading(false);
        if (res?.show_error_modal) {
          setConfirmData(null);
          setErrorModal(true);
        } else {
          toast.error(res?.message || "Modification failed. Please try again.");
        }
      }
    } catch (err) {
      setConfirmLoading(false);
      setConfirmData(null);
      if (err?.response?.data?.show_error_modal) {
        setErrorModal(true);
      } else {
        toast.error(
          err?.response?.data?.message || err?.message || "Modification failed. Please try again."
        );
      }
    }
  };

  const handleRenew = async () => {
    if (!data?.subscription) return;
    try {
      const payload = {
        categories: (data.subscription.categories || []).map((c) => c.id),
        subcategories: (data.subscription.categories || [])
          .flatMap((c) => (c.sub_categories || []).map((sc) => sc.id)),
        hotels: (data.subscription.hotels || []).map((h) => h.id)
      };
      const res = await renewHospitalitySubscription(payload);
      if (res?.status === 1 && res?.data?.order_id) {
        await openPayment(res.data);
      } else {
        toast.error(res?.message || "Unable to initiate renewal.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Renewal failed. Please try again."
      );
    }
  };

  const handleOpenDrawer = () => setDrawerOpen(true);

  const handleEditFromOverview = () => {
    setActiveTab("items");
    setTimeout(() => setDrawerOpen(true), 100);
  };

  const handleExtend = async () => {
    try {
      const res = await extendSubscription();
      if (res?.status === 1 && res?.data?.order_id) {
        await openPayment(res.data);
      } else {
        toast.error(res?.message || "Unable to initiate extension.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Extension failed. Please try again."
      );
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Subscription</h1>
        </div>
        <div className="hasFullLoader" style={{ minHeight: "300px", position: "relative" }}>
          <FullLoader />
        </div>
      </div>
    );
  }

  const isNone = !data || data.status === "none";

  return (
    <>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Subscription</h1>

            {!isNone && (
              <div className={styles.tabs}>
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isNone ? (
            <EmptyState />
          ) : (
            <>
              {/* ── Overview Tab ── */}
              {activeTab === "overview" && (
                <>
                  <HeroStatusCard
                    data={data}
                    onEdit={handleEditFromOverview}
                    onRenew={handleRenew}
                    onExtend={handleExtend}
                    disabled={paymentInProgress}
                  />

                  <PaymentHistorySection
                    payments={data.payment_history || []}
                  />
                </>
              )}

              {/* ── Manage Subscription Tab ── */}
              {activeTab === "items" && (
                <>
                  <CategoriesPanel
                    categories={data.subscription?.categories || []}
                    onAdd={data.available_actions?.can_modify ? handleOpenDrawer : null}
                  />

                  <HotelsPanel
                    hotels={data.subscription?.hotels || []}
                    onAdd={data.available_actions?.can_modify ? handleOpenDrawer : null}
                  />
                </>
              )}
            </>
          )}
        </div>

      <EditSubscriptionDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setConfirmData(null);
        }}
        currentData={data}
        onSubmit={handleDrawerSubmit}
      />

      {confirmData && (
        <ModificationConfirmModal
          preview={confirmData.preview}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmData(null)}
          loading={confirmLoading}
        />
      )}

      {successModal && (
        <ModificationSuccessModal
          data={successModal}
          onClose={handleSuccessClose}
        />
      )}

      {errorModal && (
        <SubscriptionErrorModal
          onClose={() => {
            setErrorModal(false);
            refreshAll();
          }}
        />
      )}

      {paymentInProgress && (
        <div className={styles.paymentOverlay}>
          <div className={styles.paymentOverlayCard}>
            <div className={styles.paymentSpinner} />
            <h3 className={styles.paymentOverlayTitle}>Processing your subscription</h3>
            <p className={styles.paymentOverlayText}>Please do not refresh or go back while we complete your payment.</p>
          </div>
        </div>
      )}
    </>
  );
};

export default SubscriptionPage;
