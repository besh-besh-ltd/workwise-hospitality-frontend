import Head from "next/head";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

export default function VendorCoC() {
  const router = useRouter();
  const [isAccepted, setIsAccepted] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const contentRef = useRef(null);
  const checkboxRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const element = contentRef.current;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

      if (isAtBottom) {
        setIsScrolledToBottom(true);
        if (checkboxRef.current) {
          checkboxRef.current.checked = true;
        }
        setIsAccepted(true);
        localStorage.setItem('vendor_coc_accepted', 'true');
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('vendorCocAccepted'));
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
  }, []);

  const handleAccept = () => {
    localStorage.setItem('vendor_coc_accepted', 'true');
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('vendorCocAccepted'));
    if (window.opener) {
      window.close();
    } else {
      window.close();
    }
  };

  return (
    <>
      <Head>
        <title>Vendor Ethical Code of Conduct, Anti-Bribery & Anti-Corruption Policy</title>
        <style dangerouslySetInnerHTML={{__html: `
          input[type="checkbox"]:checked {
            accent-color: #28a745 !important;
          }
          input[type="checkbox"].vendor-coc-checked:checked {
            accent-color: #28a745 !important;
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
              III. Vendor Ethical Code of Conduct, Anti-Bribery & Anti-Corruption Policy
            </h1>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                1. Purpose
              </h2>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                This Policy defines the ethical, legal, and compliance standards that all vendors must follow when registering on the Phileein Hospitality Private Limited's Vendor Portal. The Portal enables multiple companies/entities to purchase products and services.
              </p>
              <p style={{ lineHeight: '1.8', color: '#555' }}>
                The aim of this Policy is to ensure that all vendor engagements are conducted with integrity, transparency, and accountability, while strictly prohibiting bribery, corruption, or unethical practices.
              </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                2. Scope
              </h2>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                This Policy applies to:
              </p>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>All vendors, suppliers, service providers, contractors, and their representatives registering on the Vendor Portal.</li>
                <li style={{ marginBottom: '10px' }}>All transactions and interactions with any companies/entities registered under the Vendor Portal.</li>
                <li style={{ marginBottom: '10px' }}>Any subcontractors, agents, or third parties engaged by vendors for portal-related activities.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                3. Ethical Business Practices
              </h2>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                Vendors shall:
              </p>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Conduct business honestly, fairly, and with integrity.</li>
                <li style={{ marginBottom: '10px' }}>Comply with all applicable laws, rules, and regulations in the jurisdictions where they operate.</li>
                <li style={{ marginBottom: '10px' }}>Avoid fraudulent, deceptive, or misleading practices.</li>
                <li style={{ marginBottom: '10px' }}>Ensure that products and services provided are of the quality, safety, and authenticity promised.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                4. Anti-Bribery and Anti-Corruption
              </h2>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                Vendors must not, directly or indirectly:
              </p>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Offer, promise, solicit, or accept bribes, kickbacks, or improper payments to secure or influence business.</li>
                <li style={{ marginBottom: '10px' }}>Provide cash, gifts, favors, hospitality, entertainment, or services to employees or representatives of the Company or entities under the Portal with the intent of influencing decisions.</li>
                <li style={{ marginBottom: '10px' }}>Engage in or support facilitation payments (unofficial payments to speed up routine processes).</li>
                <li style={{ marginBottom: '10px' }}>Use agents, consultants, or intermediaries to make improper payments on their behalf.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                5. Fair Competition
              </h2>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                Vendors must compete fairly and comply with all applicable competition and anti-trust laws.
              </p>
              <p style={{ lineHeight: '1.8', color: '#555' }}>
                Collusive practices such as price-fixing, bid-rigging, or market allocation are strictly prohibited.
              </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                6. Human Rights and Labour Standards
              </h2>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Vendors must not use child labour, forced labour, or exploitative practices.</li>
                <li style={{ marginBottom: '10px' }}>Vendors must provide a safe and inclusive workplace, free from discrimination and harassment.</li>
                <li style={{ marginBottom: '10px' }}>Vendors must comply with laws governing wages, working hours, and employee rights.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                7. Environmental Responsibility
              </h2>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                Vendors are encouraged to adopt sustainable and environmentally responsible practices.
              </p>
              <p style={{ lineHeight: '1.8', color: '#555' }}>
                Vendors must comply with applicable environmental laws relating to their operations, packaging, and products.
              </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                8. Confidentiality and Data Protection
              </h2>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Vendors must protect the confidential information, trade secrets, and intellectual property of the Company and its group entities.</li>
                <li style={{ marginBottom: '10px' }}>Vendors must comply with applicable data protection and privacy regulations.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                9. Conflict of Interest
              </h2>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                Vendors must avoid conflicts between their personal or financial interests and their obligations to the Company or entities under the Portal.
              </p>
              <p style={{ lineHeight: '1.8', color: '#555' }}>
                Any actual or potential conflicts of interest must be disclosed promptly.
              </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                10. Reporting Misconduct
              </h2>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                Vendors must report any suspected or actual violation of this Policy, including bribery, corruption, fraud, or unethical conduct.
              </p>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                Reports may be submitted through the Company's whistleblowing or grievance mechanism which is listed below:
              </p>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Email Id: info@phileeinhospitality.com</li>
                <li style={{ marginBottom: '10px' }}>Email Id: ____________________________________</li>
              </ul>
              <p style={{ marginTop: '15px', lineHeight: '1.8', color: '#555' }}>
                All reports will be treated with confidentiality, and no retaliation will occur against vendors who report in good faith.
              </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                11. Compliance and Consequences
              </h2>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                Compliance with this Policy is a mandatory requirement for vendor registration and continued engagement with entities under the Vendor Portal.
              </p>
              <p style={{ marginBottom: '15px', lineHeight: '1.8', color: '#555' }}>
                Violations of this Policy may lead to:
              </p>
              <ul style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}>Rejection or suspension of vendor registration,</li>
                <li style={{ marginBottom: '10px' }}>Termination of business relationships,</li>
                <li style={{ marginBottom: '10px' }}>Blacklisting from future business opportunities,</li>
                <li style={{ marginBottom: '10px' }}>Legal or regulatory reporting where applicable.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
                12. Acknowledgment
              </h2>
              <p style={{ lineHeight: '1.8', color: '#555' }}>
                By completing the registration process on the Vendor Portal, vendors confirm that they have read, understood, and agreed to comply with this Vendor Ethical Code of Conduct, Anti-Bribery & Anti-Corruption Policy, applicable to all companies/entities registered under the Portal.
              </p>
            </section>
          </div>

          <div style={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: '#fff',
            padding: '20px 0',
            borderTop: '2px solid #e0e0e0',
            marginTop: '40px',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'default',
                userSelect: 'none',
                fontSize: '16px',
                color: isAccepted ? '#28a745' : '#6c757d',
                transition: 'color 0.3s ease'
              }}>
                <input
                  ref={checkboxRef}
                  type="checkbox"
                  readOnly
                  disabled
                  checked={isAccepted}
                  className={isAccepted ? 'vendor-coc-checked' : ''}
                  style={{
                    width: '20px',
                    height: '20px',
                    marginRight: '10px',
                    cursor: 'default',
                    pointerEvents: 'none',
                    accentColor: '#28a745',
                    transition: 'all 0.3s ease'
                  }}
                />
                <span style={{ color: isAccepted ? '#28a745' : '#6c757d' }}>
                  I have read and accept the ethical code of conduct
                </span>
              </label>
              
              {isAccepted && (
                <button
                  onClick={handleAccept}
                  style={{
                    padding: '12px 40px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
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

