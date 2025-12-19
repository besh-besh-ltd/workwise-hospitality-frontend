import React, { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";

const PaymentSuccessPage = () => {
  const router = useRouter();
  const {
    type,
    amount,
    currency,
    description,
    order_id,
    invoice_url,
    expiry_date
  } = router.query || {};

  useEffect(() => {
    // Ensure currency default
    if (!currency && amount) {
      router.replace({
        pathname: router.pathname,
        query: { ...router.query, currency: "INR" }
      }, undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prettyType =
    type === "hospitality_vendor"
      ? "Hospitality Vendor Subscription"
      : type === "subscription"
      ? "Platform Subscription"
      : type === "tender"
      ? "Tender Fee Payment"
      : "Payment";

  const safeAmount =
    typeof amount === "string" && amount !== ""
      ? Number(amount)
      : undefined;

  return (
    <>
      <Head>
        <title>Payment Successful | Workwise</title>
      </Head>

      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Payment Successful</h1>
        </div>
      </section>

      <section className="vendor-sec-1">
        <div className="container-fluid">
          <div className="row justify-content-center">
            <div className="col-lg-8 col-md-10">
              <div className="card p-4 p-md-5 shadow-sm">
                <h2 className="mb-3">Thank you for your payment.</h2>
                <p className="text-muted mb-4">
                  Your {prettyType.toLowerCase()} has been processed successfully.
                </p>

                <div className="border rounded p-3 mb-4 bg-light">
                  <h5 className="mb-3">Payment Summary</h5>
                  <ul className="list-unstyled mb-0">
                    {safeAmount !== undefined && (
                      <li className="mb-1">
                        <strong>Amount Paid:</strong>{" "}
                        {currency || "INR"}{" "}
                        {safeAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </li>
                    )}
                    {description && (
                      <li className="mb-1">
                        <strong>Description:</strong> {description}
                      </li>
                    )}
                    {order_id && (
                      <li className="mb-1">
                        <strong>Order ID:</strong> {order_id}
                      </li>
                    )}
                    {expiry_date && (
                      <li className="mb-1">
                        <strong>Subscription Expiry:</strong> {expiry_date}
                      </li>
                    )}
                  </ul>
                </div>

                <div className="mb-4">
                  {invoice_url ? (
                    <>
                      <h5 className="mb-2">Invoice</h5>
                      <p className="text-muted mb-3">
                        You can download your invoice using the button below. A copy has
                        also been sent to your registered email address.
                      </p>
                      <a
                        href={invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary me-2"
                      >
                        Download Invoice
                      </a>
                    </>
                  ) : (
                    <>
                      <h5 className="mb-2">Invoice</h5>
                      <p className="text-muted mb-0">
                        Your invoice will be emailed to your registered email address once
                        it is generated.
                      </p>
                    </>
                  )}
                </div>

                <div className="d-flex flex-wrap gap-2">
                  <Link href="/dashboard/vendor" legacyBehavior>
                    <a className="btn btn-success">Go to Vendor Dashboard</a>
                  </Link>
                  <Link href="/dashboard" legacyBehavior>
                    <a className="btn btn-outline-secondary">Go to Main Dashboard</a>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default PaymentSuccessPage;


