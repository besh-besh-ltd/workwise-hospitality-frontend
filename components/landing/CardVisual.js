import React from 'react';
import { NAVY, GOLD, RED_MARK, GREEN_MARK } from './theme';

// Vendor B is objectively cheapest (green), but the order still goes to the
// long-standing favourite (C) at a worse rate — the whole point of the card.
// Real vendor names get redacted mid-loop; price and grade never change, so the
// cheapest bid wins on merit rather than on whose name is attached to it.
const MASKED_BIDS = [
  { vendor: 'Sharma Traders', price: '₹1,842', grade: 'Grade A' },
  { vendor: 'Vikram Agro', price: '₹1,798', grade: 'Grade A', best: true },
  { vendor: 'Deccan Supply', price: '₹1,905', grade: 'Grade B' },
];

const VENDOR_PICKS = [
  { slot: 'a', letter: 'A', price: '₹42/kg', label: 'Moderate Pricing' },
  { slot: 'b', letter: 'B', price: '₹35/kg', label: 'Best Pricing', best: true },
  { slot: 'c', letter: 'C', price: '₹48/kg', label: 'Favouritism', chosen: true },
];

// Three vendor quotes where no single vendor wins every line — the cheapest
// unit price, freight, delivery and grand total each sit on a different sheet,
// which is exactly why the best deal is "buried in the details".
const QUOTE_SHEETS = [
  {
    vendor: 'Vendor A',
    slot: 'a',
    rows: [
      { label: 'Unit Price', value: '₹1,180', best: true },
      { label: 'Packaging', value: '₹80' },
      { label: 'Freight', value: '₹210' },
      { label: 'Tax', value: '₹340' },
      { label: 'Other Charges', value: '₹65' },
      { label: 'Delivery', value: '12 Aug' },
    ],
    total: '₹1,875',
  },
  {
    vendor: 'Vendor B',
    slot: 'b',
    rows: [
      { label: 'Unit Price', value: '₹1,240' },
      { label: 'Packaging', value: '₹60' },
      { label: 'Freight', value: '₹90', best: true },
      { label: 'Tax', value: '₹355' },
      { label: 'Other Charges', value: '₹70' },
      { label: 'Delivery', value: '09 Aug', best: true },
    ],
    total: '₹1,815',
  },
  {
    vendor: 'Vendor C',
    slot: 'c',
    rows: [
      { label: 'Unit Price', value: '₹1,210' },
      { label: 'Packaging', value: '₹75' },
      { label: 'Freight', value: '₹140' },
      { label: 'Tax', value: '₹348' },
      { label: 'Other Charges', value: '₹25' },
      { label: 'Delivery', value: '15 Aug' },
    ],
    total: '₹1,798',
    totalBest: true,
  },
];

// Single-stroke ellipse that overshoots its start point, so it reads as a
// circle drawn by hand rather than a perfect vector ring.
const RING_PATH =
  'M 62,4 C 88,6 97,14 96,23 C 95,33 74,41 48,40 C 22,39 4,32 4,22 C 4,12 24,4 52,4 C 70,4 84,8 92,15';

const AnnotationRing = ({ order }) => (
  <svg className={`lh-cv-ring lh-cv-ring-${order}`} viewBox="0 0 100 44" preserveAspectRatio="none">
    <path d={RING_PATH} pathLength="100" vectorEffect="non-scaling-stroke" />
  </svg>
);

const CardVisual = ({ variant = 'clock', iconElement, color = NAVY, activeKey }) => {
  const badgeContent = iconElement || null;

  // Ring reveal order runs left-to-right across the sheets.
  let ringOrder = 0;

  return (
    <div key={activeKey} className={`lh-card-visual lh-cv-${variant}`}>
      {variant === 'clock' && (
        <div className="lh-cv-scene">
          {QUOTE_SHEETS.map((sheet) => (
            <div key={sheet.vendor} className={`lh-cv-q-sheet lh-cv-q-sheet-${sheet.slot}`}>
              <div className="lh-cv-q-head">{sheet.vendor}</div>

              {sheet.rows.map((row) => (
                <div key={row.label} className="lh-cv-q-row">
                  <span className="lh-cv-q-label">{row.label}</span>
                  <span className="lh-cv-q-val">
                    {row.value}
                    {row.best && <AnnotationRing order={(ringOrder += 1)} />}
                  </span>
                </div>
              ))}

              <div className="lh-cv-q-row lh-cv-q-total">
                <span className="lh-cv-q-label">Grand Total</span>
                <span className="lh-cv-q-val">
                  {sheet.total}
                  {sheet.totalBest && <AnnotationRing order={(ringOrder += 1)} />}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === 'alert' && (
        <div className="lh-cv-scene">
          <svg className="lh-cv-chip-lines" viewBox="0 0 300 300" preserveAspectRatio="none">
            <line className="lh-cv-chip-line" x1="150" y1="150" x2="72" y2="92" />
            <line className="lh-cv-chip-line" x1="150" y1="150" x2="228" y2="100" />
            <line className="lh-cv-chip-line" x1="150" y1="150" x2="90" y2="212" />
          </svg>
          <span className="lh-cv-chip lh-cv-chip-1">
            <i className="lh-cv-chip-dot" />
            <span className="lh-cv-chip-body">
              <span className="lh-cv-chip-unit">Business Unit A</span>
              <span className="lh-cv-chip-rate">{'₹'}42/kg</span>
            </span>
          </span>
          <span className="lh-cv-chip lh-cv-chip-2">
            <i className="lh-cv-chip-dot" />
            <span className="lh-cv-chip-body">
              <span className="lh-cv-chip-unit">Business Unit B</span>
              <span className="lh-cv-chip-rate">{'₹'}58/kg</span>
            </span>
          </span>
          <span className="lh-cv-chip lh-cv-chip-3">
            <i className="lh-cv-chip-dot" />
            <span className="lh-cv-chip-body">
              <span className="lh-cv-chip-unit">Business Unit C</span>
              <span className="lh-cv-chip-rate">{'₹'}35/kg</span>
            </span>
          </span>
        </div>
      )}

      {variant === 'users' && (
        <div className="lh-cv-scene">
          <span className="lh-cv-team-node">Procurement Team</span>
          <svg className="lh-cv-pick-line" viewBox="0 0 300 300" preserveAspectRatio="none">
            <path d="M 150,66 C 198,100 236,126 250,150" />
          </svg>

          {VENDOR_PICKS.map((vendor) => (
            <div
              key={vendor.letter}
              className={[
                'lh-cv-pick-card',
                `lh-cv-pick-card-${vendor.slot}`,
                vendor.best ? 'lh-cv-pick-card-best' : '',
                vendor.chosen ? 'lh-cv-pick-card-chosen' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="lh-cv-pick-avatar">{vendor.letter}</span>
              <span className="lh-cv-pick-price">{vendor.price}</span>
              <span className="lh-cv-pick-tag">{vendor.label}</span>
              {vendor.chosen && <span className="lh-cv-pick-awarded">Awarded</span>}
            </div>
          ))}
        </div>
      )}

      {variant === 'chart' && (
        <div className="lh-cv-scene">
          <div className="lh-cv-chart-card">
            <div className="lh-cv-rate-head">
              <span className="lh-cv-rate-eyebrow">Rate Comparison</span>
              <span className="lh-cv-rate-sku">Cooking Oil, 15L Tin</span>
            </div>
            <div className="lh-cv-rate-rows">
              <div className="lh-cv-rate-row lh-cv-rate-row-1">
                <span className="lh-cv-rate-name">Goa</span>
                <span className="lh-cv-rate-bar-track">
                  <span className="lh-cv-rate-bar lh-cv-rate-bar-1" />
                </span>
                <span className="lh-cv-rate-value">{'₹'}2,008</span>
                <span className="lh-cv-rate-gap">+{'₹'}210</span>
              </div>
              <div className="lh-cv-rate-row lh-cv-rate-row-2">
                <span className="lh-cv-rate-name">Chennai</span>
                <span className="lh-cv-rate-bar-track">
                  <span className="lh-cv-rate-bar lh-cv-rate-bar-2" />
                </span>
                <span className="lh-cv-rate-value">{'₹'}1,921</span>
                <span className="lh-cv-rate-gap">+{'₹'}123</span>
              </div>
              <div className="lh-cv-rate-row lh-cv-rate-row-3">
                <span className="lh-cv-rate-name">Mumbai</span>
                <span className="lh-cv-rate-bar-track">
                  <span className="lh-cv-rate-bar lh-cv-rate-bar-3" />
                </span>
                <span className="lh-cv-rate-value">{'₹'}1,842</span>
                <span className="lh-cv-rate-gap">+{'₹'}44</span>
              </div>
              <div className="lh-cv-rate-row lh-cv-rate-row-best lh-cv-rate-row-4">
                <span className="lh-cv-rate-name">Pune</span>
                <span className="lh-cv-rate-bar-track">
                  <span className="lh-cv-rate-bar lh-cv-rate-bar-best" />
                </span>
                <span className="lh-cv-rate-value lh-cv-rate-value-best">{'₹'}1,798</span>
                <span className="lh-cv-rate-gap lh-cv-rate-gap-best">Best</span>
              </div>
            </div>
            <div className="lh-cv-rate-foot">
              <span>Spread, highest to lowest</span>
              <span className="lh-cv-rate-spread">11.7%</span>
            </div>
          </div>
        </div>
      )}

      {variant === 'check' && (
        <div className="lh-cv-scene">
          <div className="lh-cv-one-product">
            <span className="lh-cv-one-name">Refined Sunflower Oil · 15L</span>
            <span className="lh-cv-one-price">{'₹'}1,798</span>
            <span className="lh-cv-one-tag">Negotiated Rate · Locked</span>
          </div>

          <svg className="lh-cv-one-links" viewBox="0 0 300 300" preserveAspectRatio="none">
            <path d="M 150,110 C 150,152 51,170 51,196" />
            <path d="M 150,110 L 150,196" />
            <path d="M 150,110 C 150,152 249,170 249,196" />
          </svg>

          {['Business Unit A', 'Business Unit B', 'Business Unit C'].map((unit, index) => (
            <div key={unit} className={`lh-cv-one-unit lh-cv-one-unit-${index + 1}`}>
              <span className="lh-cv-one-unit-name">{unit}</span>
              <span className="lh-cv-one-unit-rate">
                {'₹'}1,798
                <i className="lh-cv-one-tick">✓</i>
              </span>
            </div>
          ))}
        </div>
      )}

      {variant === 'shield' && (
        <div className="lh-cv-scene">
          <div className="lh-cv-vm-card">
            <div className="lh-cv-vm-head">
              <span className="lh-cv-vm-eyebrow">Blind Evaluation</span>
              <span className="lh-cv-vm-sku">Cooking Oil, 15L Tin</span>
            </div>

            <div className="lh-cv-vm-rows">
              {MASKED_BIDS.map((bid, index) => (
                <div
                  key={bid.vendor}
                  className={`lh-cv-vm-row lh-cv-vm-row-${index + 1}${
                    bid.best ? ' lh-cv-vm-row-best' : ''
                  }`}
                >
                  <span className="lh-cv-vm-name">
                    <span className="lh-cv-vm-name-text">{bid.vendor}</span>
                    <span className="lh-cv-vm-cover">Vendor {index + 1}</span>
                  </span>
                  <span className="lh-cv-vm-price">{bid.price}</span>
                  <span className="lh-cv-vm-grade">{bid.grade}</span>
                  <span className="lh-cv-vm-flag">{bid.best ? 'Best' : ''}</span>
                </div>
              ))}
            </div>

            <div className="lh-cv-vm-foot">Names hidden · scored on price &amp; spec only</div>
          </div>
        </div>
      )}

      {/* Only the alert scene still needs a centre hub; every other variant
          now draws its own full illustration. */}
      {variant === 'alert' && <div className="lh-cv-badge">{badgeContent}</div>}

      <style jsx>{`
        .lh-card-visual {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 320px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
          overflow: hidden;
          background: linear-gradient(160deg, ${color}14 0%, ${color}05 100%);
          border: 1px solid ${color}22;
          animation: lh-cv-in 0.4s ease;
        }
        @keyframes lh-cv-in {
          from {
            opacity: 0;
            transform: scale(0.94);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .lh-cv-scene {
          position: absolute;
          inset: 0;
        }
        .lh-cv-badge {
          position: relative;
          z-index: 1;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid ${color}22;
          box-shadow: 0 14px 28px -14px ${color}66;
          color: ${color};
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* --- clock: floating vendor quote sheets, best values circled in red --- */
        .lh-cv-q-sheet {
          position: absolute;
          width: 31%;
          background: #ffffff;
          border: 1px solid ${color}22;
          border-radius: 10px;
          box-shadow: 0 16px 28px -16px ${color}55;
          padding: 7px 9px 8px;
          animation: lh-cv-q-float ease-in-out infinite;
        }
        .lh-cv-q-sheet-a {
          top: 37%;
          left: 2%;
          --r: -3deg;
          animation-duration: 4.2s;
        }
        .lh-cv-q-sheet-b {
          top: 29%;
          left: 34.5%;
          --r: 2deg;
          animation-duration: 4.8s;
          animation-delay: 0.5s;
        }
        .lh-cv-q-sheet-c {
          top: 40%;
          left: 67%;
          --r: -2deg;
          animation-duration: 4.5s;
          animation-delay: 1s;
        }
        @keyframes lh-cv-q-float {
          0%,
          100% {
            transform: translateY(0) rotate(var(--r, 0deg));
          }
          50% {
            transform: translateY(-9px) rotate(var(--r, 0deg));
          }
        }
        .lh-cv-q-head {
          font-size: 0.54rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: ${color};
          padding-bottom: 5px;
          margin-bottom: 3px;
          border-bottom: 1px solid ${color}1a;
        }
        .lh-cv-q-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          padding: 2.5px 0;
        }
        .lh-cv-q-label {
          font-size: 0.46rem;
          font-weight: 600;
          color: ${color}88;
          white-space: nowrap;
        }
        .lh-cv-q-val {
          position: relative;
          font-size: 0.5rem;
          font-weight: 700;
          color: ${color};
          white-space: nowrap;
        }
        .lh-cv-q-total {
          margin-top: 3px;
          padding-top: 5px;
          border-top: 1px solid ${color}1a;
        }
        .lh-cv-q-total .lh-cv-q-label {
          color: ${color};
          font-weight: 800;
        }
        .lh-cv-q-total .lh-cv-q-val {
          font-size: 0.58rem;
          font-weight: 800;
        }
        /* Red pen ring drawn around the winning value on each line.
           AnnotationRing is a child component, so styled-jsx can't hash its
           elements — these must be :global(), anchored to the scoped parent. */
        .lh-cv-q-val :global(.lh-cv-ring) {
          position: absolute;
          top: 50%;
          left: 50%;
          width: calc(100% + 18px);
          height: calc(100% + 14px);
          transform: translate(-50%, -50%);
          overflow: visible;
          pointer-events: none;
        }
        .lh-cv-q-val :global(.lh-cv-ring path) {
          fill: none;
          stroke: ${RED_MARK};
          stroke-width: 1.6;
          stroke-linecap: round;
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: lh-cv-ring-draw 6s ease-in-out infinite;
        }
        .lh-cv-q-val :global(.lh-cv-ring-1 path) {
          animation-delay: 0.2s;
        }
        .lh-cv-q-val :global(.lh-cv-ring-2 path) {
          animation-delay: 1s;
        }
        .lh-cv-q-val :global(.lh-cv-ring-3 path) {
          animation-delay: 1.8s;
        }
        .lh-cv-q-val :global(.lh-cv-ring-4 path) {
          animation-delay: 2.6s;
        }
        @keyframes lh-cv-ring-draw {
          0% {
            stroke-dashoffset: 100;
            opacity: 1;
          }
          18% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          82% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          92%,
          100% {
            stroke-dashoffset: 0;
            opacity: 0;
          }
        }
        /* --- alert: mismatched price chips wired to a central flag --- */
        .lh-cv-chip-lines {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .lh-cv-chip-line {
          stroke: ${color};
          stroke-width: 1.5;
          stroke-dasharray: 4 5;
          opacity: 0.35;
          animation: lh-cv-line-march 1.4s linear infinite;
        }
        @keyframes lh-cv-line-march {
          to {
            stroke-dashoffset: -18;
          }
        }
        .lh-cv-chip {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 13px 8px 10px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid ${color}2a;
          box-shadow: 0 10px 20px -12px ${color}66;
          color: ${color};
          white-space: nowrap;
          animation: lh-cv-chip-pulse ease-in-out infinite;
        }
        .lh-cv-chip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${color}99;
          flex-shrink: 0;
        }
        .lh-cv-chip-body {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.25;
        }
        .lh-cv-chip-unit {
          font-size: 0.52rem;
          font-weight: 600;
          color: ${color}88;
        }
        .lh-cv-chip-rate {
          font-size: 0.8rem;
          font-weight: 700;
        }
        .lh-cv-chip-1 {
          top: 24%;
          left: 12%;
          animation-duration: 2.4s;
        }
        .lh-cv-chip-2 {
          top: 20%;
          right: 10%;
          animation-duration: 2.8s;
          animation-delay: 0.35s;
        }
        .lh-cv-chip-3 {
          bottom: 22%;
          left: 20%;
          animation-duration: 2.2s;
          animation-delay: 0.7s;
        }
        @keyframes lh-cv-chip-pulse {
          0%,
          100% {
            transform: scale(1) rotate(0deg);
          }
          50% {
            transform: scale(1.08) rotate(-2deg);
          }
        }

        /* --- users: cheapest vendor flagged green, order still goes to the favourite --- */
        .lh-cv-team-node {
          position: absolute;
          top: 16%;
          left: 50%;
          transform: translateX(-50%);
          padding: 5px 13px;
          border-radius: 999px;
          background: ${color}14;
          border: 1px solid ${color}33;
          color: ${color};
          font-size: 0.6rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .lh-cv-pick-line {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .lh-cv-pick-line path {
          fill: none;
          stroke: ${RED_MARK};
          stroke-width: 1.5;
          stroke-dasharray: 4 5;
          opacity: 0.55;
          animation: lh-cv-line-march 1.4s linear infinite;
        }
        .lh-cv-pick-card {
          position: absolute;
          top: 52%;
          width: 29%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          padding: 13px 8px 12px;
          background: #ffffff;
          border: 1px solid ${color}22;
          border-radius: 12px;
          box-shadow: 0 14px 26px -16px ${color}55;
        }
        .lh-cv-pick-card-a {
          left: 3%;
        }
        .lh-cv-pick-card-b {
          left: 35.5%;
        }
        .lh-cv-pick-card-c {
          left: 68%;
        }
        .lh-cv-pick-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: ${GOLD}22;
          color: ${GOLD};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.74rem;
          font-weight: 800;
        }
        .lh-cv-pick-price {
          font-size: 0.78rem;
          font-weight: 800;
          color: ${color};
        }
        .lh-cv-pick-tag {
          padding: 3px 8px;
          border-radius: 999px;
          background: ${GOLD}22;
          color: ${GOLD};
          font-size: 0.48rem;
          font-weight: 800;
          text-align: center;
          white-space: nowrap;
        }
        /* Best-priced vendor reads green, then visibly dims as the award lands elsewhere. */
        .lh-cv-pick-card-best {
          border-color: ${GREEN_MARK}55;
          animation: lh-cv-best-ignored 4s ease-in-out infinite;
        }
        .lh-cv-pick-card-best .lh-cv-pick-avatar,
        .lh-cv-pick-card-best .lh-cv-pick-tag {
          background: ${GREEN_MARK}1f;
          color: ${GREEN_MARK};
        }
        .lh-cv-pick-card-best .lh-cv-pick-price {
          color: ${GREEN_MARK};
        }
        @keyframes lh-cv-best-ignored {
          0%,
          30% {
            opacity: 1;
          }
          52%,
          88% {
            opacity: 0.4;
          }
          96%,
          100% {
            opacity: 1;
          }
        }
        .lh-cv-pick-card-chosen {
          border-color: ${RED_MARK}44;
        }
        .lh-cv-pick-awarded {
          position: absolute;
          top: -11px;
          right: 6px;
          padding: 3px 9px;
          border-radius: 999px;
          background: ${RED_MARK};
          color: #ffffff;
          font-size: 0.48rem;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 6px 12px -4px ${RED_MARK}99;
          transform: scale(0) rotate(-8deg);
          animation: lh-cv-awarded-in 4s ease-in-out infinite;
        }
        @keyframes lh-cv-awarded-in {
          0%,
          28% {
            transform: scale(0) rotate(-8deg);
          }
          40% {
            transform: scale(1.15) rotate(-8deg);
          }
          48%,
          88% {
            transform: scale(1) rotate(-8deg);
          }
          96%,
          100% {
            transform: scale(0) rotate(-8deg);
          }
        }

        /* --- chart: rate comparison list, cheapest property highlighted --- */
        .lh-cv-chart-card {
          position: absolute;
          inset: 8%;
          background: #ffffff;
          border: 1px solid ${color}22;
          border-radius: 16px;
          box-shadow: 0 18px 32px -18px ${color}55;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .lh-cv-rate-head {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-bottom: 8px;
          border-bottom: 1px solid ${color}18;
        }
        .lh-cv-rate-eyebrow {
          font-size: 0.5rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: ${color}77;
        }
        .lh-cv-rate-sku {
          font-size: 0.68rem;
          font-weight: 700;
          color: ${color};
        }
        .lh-cv-rate-rows {
          display: flex;
          flex-direction: column;
          flex: 1;
          justify-content: space-evenly;
        }
        .lh-cv-rate-row {
          display: grid;
          grid-template-columns: 44px 1fr 46px 40px;
          align-items: center;
          gap: 6px;
        }
        .lh-cv-rate-row-best {
          background: ${GOLD}24;
          border-radius: 6px;
          margin: 0 -6px;
          padding: 5px 6px;
        }
        .lh-cv-rate-name {
          font-size: 0.56rem;
          font-weight: 600;
          color: ${color}99;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lh-cv-rate-bar-track {
          height: 5px;
          border-radius: 3px;
          background: ${color}14;
          overflow: hidden;
        }
        .lh-cv-rate-bar {
          display: block;
          height: 100%;
          border-radius: 3px;
          background: ${color}77;
          transform: scaleX(0);
          transform-origin: left;
          animation: lh-cv-rate-grow 3.2s ease-in-out infinite;
        }
        .lh-cv-rate-bar-1 {
          --w: 100%;
          animation-delay: 0s;
        }
        .lh-cv-rate-bar-2 {
          --w: 78%;
          animation-delay: 0.2s;
        }
        .lh-cv-rate-bar-3 {
          --w: 56%;
          animation-delay: 0.4s;
        }
        .lh-cv-rate-bar-best {
          --w: 34%;
          background: ${GOLD};
          animation-delay: 0.6s;
        }
        @keyframes lh-cv-rate-grow {
          0% {
            transform: scaleX(0);
          }
          30%,
          75% {
            transform: scaleX(1);
          }
          95%,
          100% {
            transform: scaleX(0);
          }
        }
        .lh-cv-rate-bar {
          width: var(--w);
        }
        .lh-cv-rate-value {
          font-size: 0.6rem;
          font-weight: 700;
          color: ${color};
          text-align: right;
          white-space: nowrap;
        }
        .lh-cv-rate-value-best {
          color: ${GOLD};
        }
        .lh-cv-rate-gap {
          font-size: 0.5rem;
          font-weight: 700;
          color: ${color}77;
          text-align: right;
          white-space: nowrap;
        }
        .lh-cv-rate-gap-best {
          color: ${GOLD};
        }
        .lh-cv-rate-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 8px;
          border-top: 1px solid ${color}18;
          font-size: 0.52rem;
          font-weight: 600;
          color: ${color}77;
        }
        .lh-cv-rate-spread {
          font-size: 0.78rem;
          font-weight: 800;
          color: ${color};
        }

        /* --- check: one locked product rate, mirrored by every business unit --- */
        .lh-cv-one-product {
          position: absolute;
          top: 12%;
          left: 24%;
          width: 52%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 13px 12px;
          background: #ffffff;
          border: 1px solid ${GOLD}55;
          border-radius: 14px;
          box-shadow: 0 16px 30px -18px ${color}66;
        }
        .lh-cv-one-name {
          font-size: 0.56rem;
          font-weight: 600;
          color: ${color}99;
          white-space: nowrap;
        }
        .lh-cv-one-price {
          font-size: 1.15rem;
          font-weight: 800;
          color: ${color};
          line-height: 1.1;
        }
        .lh-cv-one-tag {
          padding: 3px 10px;
          border-radius: 999px;
          background: ${GOLD};
          color: #ffffff;
          font-size: 0.46rem;
          font-weight: 800;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }
        .lh-cv-one-links {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .lh-cv-one-links path {
          fill: none;
          stroke: ${GOLD};
          stroke-width: 1.5;
          stroke-dasharray: 4 5;
          opacity: 0.55;
          animation: lh-cv-line-march 1.4s linear infinite;
        }
        .lh-cv-one-unit {
          position: absolute;
          top: 66%;
          width: 30%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 10px 6px;
          background: #ffffff;
          border: 1px solid ${color}22;
          border-radius: 10px;
          box-shadow: 0 12px 22px -16px ${color}55;
          animation: lh-cv-one-sync 4.2s ease-in-out infinite;
        }
        .lh-cv-one-unit-1 {
          left: 2%;
          animation-delay: 0s;
        }
        .lh-cv-one-unit-2 {
          left: 35%;
          animation-delay: 0.45s;
        }
        .lh-cv-one-unit-3 {
          left: 68%;
          animation-delay: 0.9s;
        }
        /* Each unit lights up in turn as the same locked rate reaches it. */
        @keyframes lh-cv-one-sync {
          0%,
          14% {
            border-color: ${color}22;
            box-shadow: 0 12px 22px -16px ${color}55;
          }
          26%,
          52% {
            border-color: ${GREEN_MARK}66;
            box-shadow: 0 12px 22px -12px ${GREEN_MARK}66;
          }
          70%,
          100% {
            border-color: ${color}22;
            box-shadow: 0 12px 22px -16px ${color}55;
          }
        }
        .lh-cv-one-unit-name {
          font-size: 0.5rem;
          font-weight: 600;
          color: ${color}88;
          white-space: nowrap;
        }
        .lh-cv-one-unit-rate {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          font-weight: 800;
          color: ${color};
          white-space: nowrap;
        }
        .lh-cv-one-tick {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${GREEN_MARK}22;
          color: ${GREEN_MARK};
          font-size: 0.5rem;
          font-style: normal;
          font-weight: 800;
          transform: scale(0);
          animation: lh-cv-one-tick-in 4.2s ease-in-out infinite;
        }
        .lh-cv-one-unit-1 .lh-cv-one-tick {
          animation-delay: 0.15s;
        }
        .lh-cv-one-unit-2 .lh-cv-one-tick {
          animation-delay: 0.6s;
        }
        .lh-cv-one-unit-3 .lh-cv-one-tick {
          animation-delay: 1.05s;
        }
        @keyframes lh-cv-one-tick-in {
          0%,
          12% {
            transform: scale(0);
          }
          24% {
            transform: scale(1.25);
          }
          32%,
          88% {
            transform: scale(1);
          }
          96%,
          100% {
            transform: scale(0);
          }
        }

        /* --- shield: vendor names redacted, price & grade stay fully readable --- */
        .lh-cv-vm-card {
          position: absolute;
          inset: 16% 8%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 14px 16px;
          background: #ffffff;
          border: 1px solid ${color}22;
          border-radius: 16px;
          box-shadow: 0 18px 32px -18px ${color}55;
        }
        .lh-cv-vm-head {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-bottom: 8px;
          border-bottom: 1px solid ${color}18;
        }
        .lh-cv-vm-eyebrow {
          font-size: 0.5rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: ${color}77;
        }
        .lh-cv-vm-sku {
          font-size: 0.68rem;
          font-weight: 700;
          color: ${color};
        }
        .lh-cv-vm-rows {
          display: flex;
          flex-direction: column;
          flex: 1;
          justify-content: center;
          gap: 14px;
        }
        .lh-cv-vm-row {
          display: grid;
          grid-template-columns: 1fr 50px 46px 28px;
          align-items: center;
          gap: 6px;
          padding: 5px 6px;
          margin: 0 -6px;
          border-radius: 6px;
        }
        .lh-cv-vm-row-best {
          background: ${GREEN_MARK}14;
        }
        /* Name sits under an opaque redaction bar that wipes across on loop. */
        .lh-cv-vm-name {
          position: relative;
          font-size: 0.56rem;
          font-weight: 700;
          color: ${color};
          white-space: nowrap;
          overflow: hidden;
        }
        .lh-cv-vm-name-text {
          display: block;
          padding: 2px 0;
        }
        .lh-cv-vm-cover {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          padding-left: 7px;
          border-radius: 4px;
          background: ${NAVY};
          color: #ffffff;
          font-size: 0.5rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          clip-path: inset(0 100% 0 0);
          animation: lh-cv-vm-mask 4.6s ease-in-out infinite;
        }
        .lh-cv-vm-row-1 .lh-cv-vm-cover {
          animation-delay: 0s;
        }
        .lh-cv-vm-row-2 .lh-cv-vm-cover {
          animation-delay: 0.35s;
        }
        .lh-cv-vm-row-3 .lh-cv-vm-cover {
          animation-delay: 0.7s;
        }
        @keyframes lh-cv-vm-mask {
          0%,
          12% {
            clip-path: inset(0 100% 0 0);
          }
          28%,
          88% {
            clip-path: inset(0 0 0 0);
          }
          97%,
          100% {
            clip-path: inset(0 100% 0 0);
          }
        }
        .lh-cv-vm-price {
          font-size: 0.6rem;
          font-weight: 800;
          color: ${color};
          text-align: right;
          white-space: nowrap;
        }
        .lh-cv-vm-row-best .lh-cv-vm-price {
          color: ${GREEN_MARK};
        }
        .lh-cv-vm-grade {
          font-size: 0.52rem;
          font-weight: 600;
          color: ${color}88;
          text-align: right;
          white-space: nowrap;
        }
        .lh-cv-vm-flag {
          font-size: 0.46rem;
          font-weight: 800;
          color: ${GREEN_MARK};
          text-align: right;
          white-space: nowrap;
        }
        .lh-cv-vm-foot {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-top: 8px;
          border-top: 1px solid ${color}18;
          font-size: 0.5rem;
          font-weight: 600;
          color: ${color}77;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default CardVisual;
