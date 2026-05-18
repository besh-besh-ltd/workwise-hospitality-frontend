import React from 'react';
import { Modal } from 'react-bootstrap';
import { BsFileEarmarkText } from 'react-icons/bs';
import { FiExternalLink } from 'react-icons/fi';

const headerStyle = { fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 };
const fileRowStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#fafbfc', border: '1px solid #eef0f2', borderRadius: 8, textDecoration: 'none', color: '#1a2730', fontSize: '0.72rem', minWidth: 0 };
const placeholderStyle = { fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '8px 12px', background: '#fafbfc', border: '1px dashed #e2e8f0', borderRadius: 8 };
const filesGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 };

const FileRow = ({ url, label }) => (
  <a href={url} target="_blank" rel="noopener noreferrer" style={fileRowStyle}>
    <BsFileEarmarkText size={13} color="#2E5BA8" />
    <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    <FiExternalLink size={12} color="#94a3b8" />
  </a>
);

const FilesGrid = ({ files, label }) => (
  files && files.length > 0 ? (
    <div style={filesGridStyle}>
      {files.map((url, idx) => (
        <FileRow key={`${label}-${idx}`} url={url} label={`Document ${idx + 1}`} />
      ))}
    </div>
  ) : (
    <div style={placeholderStyle}>No Document was uploaded for {label}</div>
  )
);

/**
 * Generic modal that lists a flat array of file URLs as "Document 1", "Document 2", …
 * Used for Buyer/Vendor Terms & Conditions in the Attachments section.
 */
export const FilesListModal = ({ show, onClose, title, files = [] }) => (
  <Modal show={show} onHide={onClose} centered>
    <div style={{ padding: '24px 24px 20px' }}>
      <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a2730', margin: '0 0 4px' }}>{title}</h5>
      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 18px' }}>
        {files.length === 0 ? 'No documents are attached.' : `${files.length} document${files.length === 1 ? '' : 's'} attached.`}
      </p>
      <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 16px' }} />
      {files.length === 0 ? (
        <div style={placeholderStyle}>No documents were uploaded.</div>
      ) : (
        files.map((url, idx) => (
          <FileRow key={`${url}-${idx}`} url={url} label={`Document ${idx + 1}`} />
        ))
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={onClose} style={{ padding: '8px 18px', fontSize: '0.82rem', fontWeight: 600, color: '#64748b', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  </Modal>
);

const Section = ({ label, files }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={headerStyle}>{label}</div>
    <FilesGrid label={label} files={files} />
  </div>
);

// Per-clause grouping is intentionally collapsed: aggregate every clause's
// files into a single flat list under the section title.
const ClauseSection = ({ label, clauses }) => {
  const allFiles = (clauses || []).flatMap((c) => c.files || []);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={headerStyle}>{label}</div>
      <FilesGrid label={label} files={allFiles} />
    </div>
  );
};

const groupBadgeStyle = (variant) => ({
  display: 'inline-block', padding: '3px 10px', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.5px', textTransform: 'uppercase', borderRadius: 999,
  background: variant === 'buyer' ? 'rgba(46, 91, 168, 0.1)' : 'rgba(220, 105, 53, 0.1)',
  color: variant === 'buyer' ? '#2E5BA8' : '#c0531e',
});

/**
 * Modal for one product's attachments. Renders two groups — Buyer (RFQ) and
 * Vendor (Quote) — each with its own labeled sections. If files don't exist
 * for a section, a "No Document was uploaded for {label}" placeholder shows.
 *
 * `groups` shape:
 *   [{
 *     title: 'Buyer (RFQ)',
 *     variant: 'buyer' | 'vendor',
 *     sections: [{ label, files: [] }, ...],
 *     clauseSections: [{ label, clauses: [{ clause_id, text, files: [] }] }],
 *   }, ...]
 */
export const ProductFilesModal = ({ show, onClose, productName, groups = [] }) => (
  <Modal show={show} onHide={onClose} centered size="lg">
    <div style={{ padding: '24px 24px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
      <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a2730', margin: '0 0 4px' }}>{productName}</h5>
      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 18px' }}>
        Documents attached to this product, from both the RFQ and the vendor's quote.
      </p>
      <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 16px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        {groups.map((g) => (
          <div key={g.title} style={{ minWidth: 0, paddingLeft: 12, borderLeft: `3px solid ${g.variant === 'buyer' ? '#2E5BA8' : '#dc6935'}` }}>
            <div style={{ marginBottom: 12 }}>
              <span style={groupBadgeStyle(g.variant)}>{g.title}</span>
            </div>
            {(g.sections || []).map((s) => (
              <Section key={`${g.title}-${s.label}`} label={s.label} files={s.files} />
            ))}
            {(g.clauseSections || []).map((cs) => (
              <ClauseSection key={`${g.title}-${cs.label}`} label={cs.label} clauses={cs.clauses} />
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={onClose} style={{ padding: '8px 18px', fontSize: '0.82rem', fontWeight: 600, color: '#64748b', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  </Modal>
);
