import Head from "next/head";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

export default function VendorTnC() {
  const router = useRouter();
  const [isAccepted, setIsAccepted] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const contentRef = useRef(null);
  const checkboxRef = useRef(null);
  const acceptButtonRef = useRef(null);

  useEffect(() => {
    // Check if already accepted
    const alreadyAccepted = localStorage.getItem('vendor_tnc_accepted') === 'true';
    if (alreadyAccepted) {
      setIsAccepted(true);
      setIsScrolledToBottom(true);
      setShowAnimation(true);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current || isAccepted) return;

      const element = contentRef.current;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;

      if (isAtBottom && !isScrolledToBottom) {
        setIsScrolledToBottom(true);
        setShowAnimation(true);
        
        // Animate checkbox
        setTimeout(() => {
          setIsAccepted(true);
          if (checkboxRef.current) {
            checkboxRef.current.checked = true;
          }
        }, 300);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      setTimeout(() => handleScroll(), 100);
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isScrolledToBottom, isAccepted]);

  const handleAccept = () => {
    localStorage.setItem('vendor_tnc_accepted', 'true');
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('vendorTncAccepted'));
    
    // Close the window
    if (window.opener) {
      window.close();
    } else {
      // If opened in same tab, go back
      router.back();
    }
  };

  return (
    <>
      <Head>
        <title>Terms & Conditions for Online Vendor Onboarding</title>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes checkmark {
            0% {
              transform: scale(0) rotate(45deg);
              opacity: 0;
            }
            50% {
              transform: scale(1.2) rotate(45deg);
              opacity: 1;
            }
            100% {
              transform: scale(1) rotate(45deg);
              opacity: 1;
            }
          }
          @keyframes fadeInScale {
            0% {
              opacity: 0;
              transform: scale(0.8);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
          .checkbox-animated {
            animation: fadeInScale 0.5s ease-out;
          }
          .checkmark-animated::after {
            animation: checkmark 0.6s ease-out;
          }
        `}} />
      </Head>

      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#fff'
      }}>
        <div
          ref={contentRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '40px 20px 0 20px',
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
            minHeight: 0
          }}
        >
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              marginBottom: '30px',
              color: '#333'
            }}>
              Terms & Conditions for Online Vendor Onboarding
            </h1>
            
            <p style={{ marginBottom: '30px', lineHeight: '1.8', color: '#555' }}>
              These Terms & Conditions ("T&C") govern the registration and onboarding of vendors on the Phileein Hospitality Private Limited online vendor management system ("Platform"). By registering as a vendor, you agree to comply with the following:
            </p>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                Eligibility
              </h2>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Vendors must be legally registered entities (Company, Partnership, Proprietorship, LLP, etc.) with valid statutory licenses.</li>
                <li style={{ marginBottom: '10px' }}>Vendors must provide accurate and up-to-date information during registration.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                Registration & Documentation
              </h2>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                Vendors must complete the online onboarding form and upload required documents, including but not limited to:
              </p>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>GST / VAT / PAN / TAN, MSME certificates</li>
                <li style={{ marginBottom: '10px' }}>Company incorporation documents</li>
                <li style={{ marginBottom: '10px' }}>Bank account details with cancelled cheque</li>
                <li style={{ marginBottom: '10px' }}>Relevant licenses, certifications, and permits</li>
              </ul>
              <p style={{ marginTop: '15px', lineHeight: '1.8', color: '#555' }}>
                Phileein Hospitality Private Limited reserves the right to verify all submitted documents before approval.
              </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                Compliance
              </h2>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Vendors must comply with all applicable local, state, and national laws, including tax, labour, and trade regulations.</li>
                <li style={{ marginBottom: '10px' }}>Vendors must follow Phileein Hospitality Private Limited's ethical, anti-bribery, and anti-corruption policies.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                Data Accuracy & Confidentiality
              </h2>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Vendors are responsible for maintaining the accuracy of their details on the platform.</li>
                <li style={{ marginBottom: '10px' }}>All vendor information will be treated confidentially and used only for business purposes.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                Approval & Rejection
              </h2>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Submission of documents does not guarantee approval.</li>
                <li style={{ marginBottom: '10px' }}>Phileein Hospitality Private Limited reserves the right to reject or terminate vendor registration without providing specific reasons.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                Performance & Quality
              </h2>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Vendors must adhere to agreed quality standards, timelines, and service levels.</li>
                <li style={{ marginBottom: '10px' }}>Non-compliance or repeated defaults may result in suspension or blacklisting.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                Registration Fees, Renewal Fees, Tender/Bid Submission Fees & Security Deposit
              </h2>
              <p style={{ lineHeight: '1.8', color: '#555' }}>
                The vendor must comply with the Terms & Conditions related to Registration Fee, Renewal Fee, Tender/Bid Fee, and Security Deposit, as separately specified under Section 'II'.
              </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                Payment Terms
              </h2>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Payments will be made as per the agreed purchase orders and contracts.</li>
                <li style={{ marginBottom: '10px' }}>Vendors must ensure submission of valid invoices, along with necessary supporting documents.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                Termination
              </h2>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                Phileein Hospitality Private Limited may terminate vendor registration for:
              </p>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Misrepresentation of information</li>
                <li style={{ marginBottom: '10px' }}>Non-compliance with legal or contractual obligations</li>
                <li style={{ marginBottom: '10px' }}>Unethical or fraudulent practices</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                Liability
              </h2>
              <p style={{ lineHeight: '1.8', color: '#555' }}>
                Vendors shall be liable for any losses, damages, or claims arising out of defective goods, poor services, or non-compliance with laws.
              </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                Amendments
              </h2>
              <p style={{ lineHeight: '1.8', color: '#555' }}>
                Phileein Hospitality Private Limited reserves the right to modify these T&C at any time. Vendors will be deemed to have accepted changes upon continued use of the platform.
              </p>
            </section>

            <section style={{ marginBottom: '40px', marginTop: '60px', paddingTop: '40px', borderTop: '2px solid #e0e0e0' }}>
              <h1 style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                marginBottom: '30px',
                color: '#333'
              }}>
                II. Terms & Conditions for Online Vendor Registration Fees, Renewal, Tender/Bid Fees, and Security Deposit
              </h1>

              <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px', color: '#333' }}>
                  1. General
                </h2>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>1.1.</strong> These Terms & Conditions govern the payment and applicability of Registration Fee, Renewal Fee, Tender/Bid Submission Fee, and Security Deposit for vendors registering on the Phileein Hospitality Private Limited's Vendor Portal.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>1.2.</strong> By initiating registration and/or making payments through the Portal, vendors confirm their acceptance of these Terms & Conditions.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>1.3.</strong> All payments must be made online via the payment gateway integrated with the Portal.
                </p>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px', color: '#333' }}>
                  2. Registration Fees
                </h2>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>2.1.</strong> A non-refundable registration fee as decided by Company's Management will be payable at the time of submitting the online vendor registration form.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>2.2.</strong> Registration fees may vary depending on vendor category, sub-category or business type, as notified by Phileein Hospitality Private Limited.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>2.3.</strong> Payment of the Registration Fee grants access to the Vendor Portal but does not guarantee the award of contracts, orders, or business opportunities.
                </p>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px', color: '#333' }}>
                  3. Renewal of Registration Fee
                </h2>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>3.1.</strong> Vendor registration will remain valid till 31st March i.e. the last day of the financial year from the date of successful registration.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>3.2.</strong> Vendors must pay a Renewal Fee before expiry of the registration validity to continue being eligible on the Portal.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>3.3.</strong> Failure to renew within the stipulated time may result in suspension or deactivation of the vendor's Portal account.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>3.4.</strong> Renewal Fee is also non-refundable.
                </p>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px', color: '#333' }}>
                  4. Tender / Bid Submission Fee
                </h2>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>4.1.</strong> For participation in specific tenders/bids, vendors are required to pay a Tender Fee / Bid Submission Fee as specified in the tender document.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>4.2.</strong> This fee is non-refundable, regardless of the outcome of the tender/bid.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>4.3.</strong> Vendors failing to pay the prescribed Tender Fee will not be eligible to participate in that tender/bid.
                </p>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px', color: '#333' }}>
                  5. Security Deposit
                </h2>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>5.1.</strong> Vendors may be required to submit a Security Deposit as part of tender participation, contract execution, or supply agreement.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>5.2.</strong> The amount, form, and validity period of the Security Deposit will be clearly specified in the respective tender/contract.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>5.3.</strong> The Security Deposit is refundable subject to successful completion of obligations, provided there is no breach, default, or penalty.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>5.4.</strong> The Security Deposit may be forfeited fully or partially in cases including (but not limited to):
                </p>
                <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px', marginTop: '10px' }}>
                  <li style={{ marginBottom: '10px' }}>Withdrawal of bids after submission,</li>
                  <li style={{ marginBottom: '10px' }}>Failure to execute the contract after award,</li>
                  <li style={{ marginBottom: '10px' }}>Breach of tender/contract terms,</li>
                  <li style={{ marginBottom: '10px' }}>Non-performance or misconduct.</li>
                </ul>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px', color: '#333' }}>
                  6. Payment Confirmation & Tax Invoice
                </h2>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  Payments must be made through the approved online payment gateway provided on the registration portal.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  All fees are payable in advance and in full before the application is processed.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  Upon successful payment, the vendor will receive a system-generated confirmation via the Portal.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  Vendors are responsible for any applicable bank charges, transaction fees, or taxes.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  If a tax invoice is required, vendors must submit a request via email to support@phileeinhospitality.com
                </p>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px', color: '#333' }}>
                  7. Refunds
                </h2>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>7.1.</strong> Registration Fees, Renewal Fees, and Tender/Bid Submission Fees are strictly non-refundable.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>7.2.</strong> Refunds, where applicable, are limited to Security Deposits only, and will be processed within 30 working days from confirmation of compliance with contract/ tender terms.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>7.3.</strong> Refunds will be credited to the bank account provided by the vendor during the online registration process.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>7.4.</strong> In case of duplicate payments due to technical error, refunds will be processed only after verification by Phileein Hospitality Private Limited.
                </p>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px', color: '#333' }}>
                  8. Non-Compliance
                </h2>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>8.1.</strong> Failure to comply with payment requirements may result in rejection of registration, cancellation of renewal, disqualification from tenders, or suspension from the Portal.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  <strong>8.2.</strong> Vendors found misrepresenting facts, defaulting on commitments, or violating Portal policies may face forfeiture of deposits and blacklisting from future opportunities.
                </p>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px', color: '#333' }}>
                  9. Rejection of Application
                </h2>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  Payment of registration fees does not guarantee vendor approval or onboarding.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  Phileein Hospitality Private Limited reserves the right to reject or cancel vendor applications at its sole discretion, without obligation to refund the registration fee.
                </p>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px', color: '#333' }}>
                  10. Dispute Resolution
                </h2>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  Any disputes related to fee payment will be handled in accordance with Phileein Hospitality Private Limited's policies.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  The courts at Mumbai, Maharashtra shall have exclusive jurisdiction over any disputes.
                </p>
              </section>

              <section style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px', color: '#333' }}>
                  Amendments and Final Authority
                </h2>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  The Company reserves the right to modify, amend, or update these Terms & Conditions at any time without prior notice.
                </p>
                <p style={{ marginBottom: '10px', lineHeight: '1.8', color: '#555' }}>
                  Decisions of the Company regarding applicability, refunds, forfeitures, or waivers shall be final and binding.
                </p>
              </section>
            </section>
          </div>

          <div style={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: '#fff',
            padding: '20px 0',
            borderTop: '2px solid #e0e0e0',
            marginTop: '40px',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'default',
                userSelect: 'none',
                fontSize: '16px',
                color: isAccepted ? '#28a745' : '#6c757d',
                transition: 'color 0.5s ease',
                fontWeight: isAccepted ? '600' : '400'
              }}>
                <input
                  ref={checkboxRef}
                  type="checkbox"
                  readOnly
                  disabled
                  checked={isAccepted}
                  className={showAnimation ? 'checkbox-animated' : ''}
                  style={{
                    width: '22px',
                    height: '22px',
                    marginRight: '12px',
                    cursor: 'default',
                    pointerEvents: 'none',
                    accentColor: '#28a745',
                    transition: 'all 0.5s ease',
                    transform: showAnimation ? 'scale(1.1)' : 'scale(1)'
                  }}
                />
                <span style={{ 
                  color: isAccepted ? '#28a745' : '#6c757d',
                  transition: 'color 0.5s ease'
                }}>
                  I have read and accept the terms and conditions
                </span>
              </label>
              
              {isAccepted && (
                <button
                  ref={acceptButtonRef}
                  onClick={handleAccept}
                  className="checkbox-animated"
                  style={{
                    padding: '12px 40px',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)',
                    animation: 'fadeInScale 0.5s ease-out'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#218838';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#28a745';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.3)';
                  }}
                >
                  Accept
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
