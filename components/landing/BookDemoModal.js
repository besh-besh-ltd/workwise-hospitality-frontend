import React from 'react';
import Modal from 'react-modal';
import BookDemoForm from './BookDemoForm';
import { FiX, FiClock, FiFileText, FiUsers, FiCheckCircle } from 'react-icons/fi';
import { NAVY } from './theme';

// See ProblemSection.js for why this returns literal JSX per branch rather
// than resolving a dynamic icon component reference.
const renderIcon = (key, size) => {
  if (key === 'clock') return <FiClock size={size} />;
  if (key === 'file') return <FiFileText size={size} />;
  if (key === 'users') return <FiUsers size={size} />;
  return <FiCheckCircle size={size} />;
};

const BookDemoModal = ({ content, onClose }) => {
  return (
    <Modal
      isOpen
      onRequestClose={onClose}
      ariaHideApp={false}
      contentLabel={content.title}
      style={{
        overlay: { backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 2000 },
        content: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '92vw',
          maxWidth: '960px',
          maxHeight: '90vh',
          overflowY: 'auto',
          right: 'auto',
          bottom: 'auto',
          border: 'none',
          borderRadius: '20px',
          padding: 0,
        },
      }}
    >
      <div className="lh-demo-modal">
        <button type="button" className="lh-demo-modal-close" onClick={onClose} aria-label="Close">
          <FiX size={20} />
        </button>

        <div className="lh-demo-modal-header">
          <h2>{content.title}</h2>
        </div>

        <div className="lh-demo-modal-body">
          <aside className="lh-demo-side">
            {content.sidePanel.items.map((item) => (
              <div key={item.title} className="lh-demo-side-item">
                <div className="lh-demo-side-icon">{renderIcon(item.icon, 18)}</div>
                <div>
                  <div className="lh-demo-side-title">{item.title}</div>
                  <div className="lh-demo-side-text">{item.text}</div>
                </div>
              </div>
            ))}

            <div className="lh-demo-side-block">
              <span className="lh-demo-side-label">{content.sidePanel.writeLabel}</span>
              <a href={`mailto:${content.sidePanel.email}`}>{content.sidePanel.email}</a>
            </div>
          </aside>

          <div className="lh-demo-form-card">
            <BookDemoForm content={content} onClose={onClose} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .lh-demo-modal {
          position: relative;
          background: #fff;
          border-radius: 20px;
          padding: 32px 28px 28px;
        }
        .lh-demo-modal-close {
          position: absolute;
          top: 18px;
          right: 18px;
          background: var(--light-grey-bg, #f8f9fa);
          border: none;
          border-radius: 50%;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--dark-color);
        }
        .lh-demo-modal-header {
          margin-bottom: 24px;
        }
        .lh-demo-modal-header h2 {
          font-weight: 800;
          font-size: 1.4rem;
          color: var(--dark-color);
          margin: 0;
        }
        .lh-demo-modal-body {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 32px;
        }
        .lh-demo-side {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .lh-demo-side-item {
          display: flex;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--light-grey-color, #f3f3f3);
        }
        .lh-demo-side-icon {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: ${NAVY}1a;
          color: ${NAVY};
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lh-demo-side-title {
          font-weight: 700;
          font-size: 0.92rem;
          color: var(--dark-color);
        }
        .lh-demo-side-text {
          font-size: 0.8rem;
          color: var(--text-color);
          margin-top: 2px;
        }
        .lh-demo-side-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .lh-demo-side-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--muted-text, #6c757d);
        }
        .lh-demo-side-block a {
          color: ${NAVY};
          font-weight: 600;
          font-size: 0.88rem;
          text-decoration: none;
        }
        .lh-demo-form-card {
          background: #fff;
          border: 1px solid var(--light-grey-color, #f3f3f3);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }

        @media (max-width: 767px) {
          .lh-demo-modal {
            padding: 24px 18px 20px;
          }
          .lh-demo-modal-body {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .lh-demo-side {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 14px;
          }
          .lh-demo-side-item {
            flex: 1 1 100%;
            border-bottom: none;
            padding-bottom: 0;
          }
          .lh-demo-form-card {
            padding: 18px;
          }
        }
      `}</style>
    </Modal>
  );
};

export default BookDemoModal;
