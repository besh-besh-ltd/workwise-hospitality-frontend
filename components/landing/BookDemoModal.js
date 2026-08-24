import React from 'react';
import Modal from 'react-modal';
import BookDemoForm from './BookDemoForm';
import { FiX, FiClock, FiFileText, FiUsers, FiCheckCircle } from 'react-icons/fi';
import { PAPER_ALT, PAPER_DEEP, INK, INK_2, INK_3, RULE, GOLD_DEEP, SERIF, SANS, BP } from './theme';

// See ProblemSection.js for why this returns literal JSX per branch rather
// than resolving a dynamic icon component reference.
const renderIcon = (key, size) => {
  if (key === 'clock') return <FiClock size={size} />;
  if (key === 'file') return <FiFileText size={size} />;
  if (key === 'users') return <FiUsers size={size} />;
  return <FiCheckCircle size={size} />;
};

const BookDemoModal = ({ content, onClose }) => (
  <Modal
    isOpen
    onRequestClose={onClose}
    ariaHideApp={false}
    contentLabel={content.title}
    style={{
      overlay: { backgroundColor: 'rgba(11, 31, 58, 0.72)', zIndex: 2000 },
      content: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '92vw',
        maxWidth: '980px',
        maxHeight: '90vh',
        overflowY: 'auto',
        right: 'auto',
        bottom: 'auto',
        border: 'none',
        borderRadius: 0,
        padding: 0,
        // Transparent, and the card shape lives on `.lh-modal` instead: this
        // inline style cannot carry a media query, and the rounded corners have
        // to move from the left edge to the top edge once the panels stack.
        background: 'transparent',
      },
    }}
  >
    <div className="lh-modal">
      <button type="button" className="lh-modal-close" onClick={onClose} aria-label="Close">
        <FiX size={19} />
      </button>

      <div className="lh-modal-body">
        <aside className="lh-modal-side">
          <h2 className="lh-modal-title">{content.title}</h2>

          <ul className="lh-modal-items">
            {content.sidePanel.items.map((item) => (
              <li key={item.title} className="lh-modal-item">
                <span className="lh-modal-item-icon">{renderIcon(item.icon, 16)}</span>
                <span>
                  <span className="lh-modal-item-title">{item.title}</span>
                  <span className="lh-modal-item-text">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="lh-modal-write">
            <span className="lh-modal-write-label">{content.sidePanel.writeLabel}</span>
            <a href={`mailto:${content.sidePanel.email}`}>{content.sidePanel.email}</a>
          </div>
        </aside>

        <div className="lh-modal-form">
          <BookDemoForm content={content} onClose={onClose} />
        </div>
      </div>
    </div>

    <style jsx>{`
      /* The card itself. It owns the rounding and clips its own children, so
         the panels inside never need to know the shape — square corners on the
         aside and the form get cut to match. */
      .lh-modal {
        position: relative;
        /* PAPER_DEEP, not PAPER: the card is the form half's background, and
           PAPER is the exact navy of the page behind the overlay, so the whole
           right side used to disappear into the hero. This also fills the two
           notches the aside's rounded right corners cut into the seam. */
        background: ${PAPER_DEEP};
        font-family: ${SANS};
        /* Rounded down the left side only — both corners of the aside — while
           the form half keeps square right corners. */
        border-radius: 20px 0 0 20px;
        overflow: hidden;
      }
      .lh-modal-close {
        position: absolute;
        top: 16px;
        right: 16px;
        z-index: 2;
        background: transparent;
        border: 1px solid ${RULE};
        border-radius: 2px;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: ${INK_2};
        transition: border-color 0.2s ease, color 0.2s ease;
      }
      .lh-modal-close:hover {
        border-color: ${GOLD_DEEP};
        color: ${GOLD_DEEP};
      }
      .lh-modal-body {
        display: grid;
        grid-template-columns: minmax(0, 0.78fr) minmax(0, 1fr);
      }
      /* Rounded on all four corners, so it reads as its own panel rather than a
         half of the card. Stated explicitly rather than left to inheritance:
         styles/scss/_all.scss:7452 styles the bare aside element with this same
         20px radius (plus white bg and 10px padding, both overridden here), and
         depending on that legacy rule for our shape would be invisible to
         anyone reading this file.
         NOTE: no backticks in this block — they close the style jsx literal. */
      .lh-modal-side {
        background: ${PAPER_ALT};
        border-radius: 20px;
        padding: clamp(28px, 4vw, 40px);
      }
      .lh-modal-title {
        font-family: ${SERIF};
        font-weight: 400;
        font-size: clamp(1.6rem, 3vw, 2.1rem);
        line-height: 1.1;
        letter-spacing: -0.015em;
        color: ${INK};
        margin: 0 0 28px;
      }
      .lh-modal-items {
        list-style: none;
        margin: 0 0 28px;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .lh-modal-item {
        display: flex;
        gap: 12px;
        padding-bottom: 18px;
        border-bottom: 1px solid ${RULE};
      }
      .lh-modal-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .lh-modal-item-icon {
        flex-shrink: 0;
        color: ${GOLD_DEEP};
        margin-top: 2px;
      }
      .lh-modal-item-title {
        display: block;
        font-size: 0.9rem;
        font-weight: 500;
        color: ${INK};
        margin-bottom: 3px;
      }
      .lh-modal-item-text {
        display: block;
        font-size: 0.82rem;
        line-height: 1.55;
        color: ${INK_2};
      }
      .lh-modal-write {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .lh-modal-write-label {
        font-size: 0.68rem;
        font-weight: 500;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: ${INK_3};
      }
      .lh-modal-write a {
        color: ${GOLD_DEEP};
        font-size: 0.9rem;
        text-decoration: none;
        width: fit-content;
        border-bottom: 1px solid ${RULE};
        padding-bottom: 2px;
      }
      /* No fill and no border of its own — it simply is the card. The only
         thing marking the split is the aside's darker PAPER_ALT panel sitting
         on top, which is why the card carries PAPER_DEEP rather than PAPER. */
      .lh-modal-form {
        padding: clamp(28px, 4vw, 40px);
      }

      @media (max-width: ${BP.md}) {
        .lh-modal-body {
          grid-template-columns: 1fr;
        }
        /* Stacked, so there is no left/right split to respect and the card
           rounds all four corners. */
        .lh-modal {
          border-radius: 20px;
        }
        .lh-modal-side {
          padding-right: 60px;
        }
      }
    `}</style>
  </Modal>
);

export default BookDemoModal;
