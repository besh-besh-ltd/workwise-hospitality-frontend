import Head from "next/head";
import React from "react";

export default function VendorTnC() {
  return (
    <>


      <main className="container py-5" style={{ maxWidth: 900, marginTop: '4rem' }}>
        <header className="mb-4">
          <h1 className="h3">Terms &amp; Conditions</h1>
          <p className="text-muted mb-0">Workwise Premium Vendor Program</p>
          <p className="text-muted">(<strong>Free till 31st December 2025</strong>)</p>
        </header>

        <section className="mb-4">
          <h2 className="h5">1. Program Overview</h2>
          <p>
            Workwise (“the Platform”) is offering complimentary access to its Premium Vendor Program for eligible suppliers,
            manufacturers, dealers, and distributors who register between <strong>October 1, 2025</strong> and <strong>December 31, 2025</strong>
            (“Offer Period”).
          </p>
          <p>During this period, all approved vendors will enjoy free access to Premium features until 31st December 2025.</p>
        </section>

        <section className="mb-4">
          <h2 className="h5">2. Eligibility</h2>
          <ul>
            <li>The offer is available only to vendors operating in industrial product categories relevant to Workwise’s buyer network (Electrical, Mechanical, Fire Safety, HVAC, Civil, Instrumentation, IT, Consumables and Safety).</li>
            <li>Vendors must submit complete and accurate information during registration.</li>
            <li>Workwise reserves the right to verify and approve or reject any registration without prior notice.</li>
          </ul>
        </section>

        <section className="mb-4">
          <h2 className="h5">3. Benefits Included in the Free Premium Program</h2>
          <ul>
            <li>Access to verified project enquiries from active buyers (EPCs, contractors, PSUs, private industrial clients).</li>
            <li>Ability to respond directly to RFQs via email or WhatsApp (no login required).</li>
            <li>AI-powered quotation auto-conversion to buyer formats.</li>
            <li>Priority visibility among vendor listings for relevant product categories.</li>
            <li>Dedicated vendor success support for assistance and onboarding.</li>
          </ul>
        </section>

        <section className="mb-4">
          <h2 className="h5">4. Offer Validity</h2>
          <ul>
            <li>The complimentary Premium access is valid till 31st December 2025.</li>
            <li>After this date, vendors may choose to continue with a paid Premium subscription to retain enhanced visibility and access.</li>
            <li>Workwise will communicate renewal options in advance.</li>
          </ul>
        </section>

        <section className="mb-4">
          <h2 className="h5">5. Vendor Commitments</h2>
          <p>By registering, you agree to:</p>
          <ul>
            <li>Respond to buyer enquiries within 24 hours whenever possible.</li>
            <li>Maintain accuracy of your product catalogue and contact information.</li>
            <li>Ensure all quoted prices and documents are genuine and free from misrepresentation.</li>
            <li>Not misuse or redistribute buyer data shared through the platform.</li>
          </ul>
        </section>

        <section className="mb-4">
          <h2 className="h5">6. Data Privacy</h2>
          <ul>
            <li>All vendor data shared during registration or via RFQs will be securely stored and used strictly for business-matching purposes.</li>
            <li>Workwise follows best practices in data protection and will not share personal or company data with unrelated third parties.</li>
          </ul>
        </section>

        <section className="mb-4">
          <h2 className="h5">7. Limitation of Liability</h2>
          <ul>
            <li>Workwise acts as a facilitator of business enquiries and does not guarantee conversion of enquiries into orders.</li>
            <li>Vendors are responsible for evaluating buyer requirements and executing contracts independently.</li>
          </ul>
        </section>

        <section className="mb-4">
          <h2 className="h5">8. Termination</h2>
          <p>Workwise reserves the right to suspend or terminate a vendor’s Premium access if:</p>
          <ul>
            <li>False information is provided during registration, or while responding to enquiries from buyers.</li>
            <li>Vendor misuses the platform for spamming or non-business activity.</li>
          </ul>
        </section>

        <section className="mb-4">
          <h2 className="h5">9. Governing Law</h2>
          <p>
            This program and its terms are governed by the laws of India, with jurisdiction in Kolkata, West Bengal.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5">10. Contact</h2>
          <p>
            For any questions or clarifications, reach out to:
            <br />
            <strong>Email:</strong> <a href="mailto:hello@letsworkwise.com">hello@letsworkwise.com</a>
            <br />
            <strong>Phone:</strong> <a href="tel:+919930787798">+91-9930787798</a> (Vendor Success Team)
          </p>
        </section>

        <footer className="mt-5 text-muted small">
          <p className="mb-0">Workwise Premium Vendor Program — Terms &amp; Conditions (Free till 31st December 2025)</p>
        </footer>
      </main>
    </>
  );
}
