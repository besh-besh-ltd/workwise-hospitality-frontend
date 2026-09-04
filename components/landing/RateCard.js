import React from 'react';
import useInView from './useInView';
import { PAPER, INK, INK_2, INK_3, RULE, GOLD, GOLD_DEEP, GREEN, TERRACOTTA, MONO, SANS } from './theme';

// Illustrative figures — the same scenario the product solves, drawn as the
// product would draw it. Replaced by a real screenshot once hero.media.src is set.
const ROWS = [
  { city: 'Goa', rate: '2,008', delta: '+210', width: 100 },
  { city: 'Chennai', rate: '1,921', delta: '+123', width: 82 },
  { city: 'Mumbai', rate: '1,842', delta: '+44', width: 66 },
  { city: 'Pune', rate: '1,798', delta: 'Best', width: 54, best: true },
];

/**
 * The hero's product visual: a live rate comparison across properties.
 * Tabular mono figures against paper — the "ledger" half of the design.
 */
const RateCard = ({ caption }) => {
  const [ref, inView] = useInView();

  return (
    <figure ref={ref} className={`lh-rate ${inView ? 'lh-rate-in' : ''}`}>
      <div className="lh-rate-head">
        <span className="lh-rate-kicker">Rate comparison</span>
        <span className="lh-rate-live">
          <i /> Live
        </span>
      </div>

      <p className="lh-rate-item">{caption || 'Refined Sunflower Oil · 15L'}</p>

      <div className="lh-rate-rows">
        {ROWS.map((row, i) => (
          <div
            key={row.city}
            className={`lh-rate-row ${row.best ? 'lh-rate-row-best' : ''}`}
            style={{ transitionDelay: `${220 + i * 90}ms` }}
          >
            <span className="lh-rate-city">{row.city}</span>
            <span className="lh-rate-bar">
              <i style={{ width: inView ? `${row.width}%` : '0%' }} />
            </span>
            <span className="lh-rate-value">₹{row.rate}</span>
            <span className="lh-rate-delta">{row.delta}</span>
          </div>
        ))}
      </div>

      <div className="lh-rate-foot">
        <span className="lh-rate-foot-label">Spread, highest to lowest</span>
        <span className="lh-rate-foot-value">11.7%</span>
      </div>

      <style jsx>{`
        .lh-rate {
          background: ${PAPER};
          border: 1px solid ${RULE};
          padding: clamp(22px, 3vw, 32px);
          margin: 0;
          box-shadow: 0 1px 0 ${RULE}, 24px 24px 0 -12px rgba(201, 162, 39, 0.06);
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .lh-rate-in {
          opacity: 1;
          transform: translateY(0);
        }
        .lh-rate-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid ${RULE};
        }
        .lh-rate-kicker {
          font-family: ${SANS};
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${INK_3};
        }
        .lh-rate-live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: ${MONO};
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: ${GREEN};
        }
        .lh-rate-live i {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: ${GREEN};
        }
        .lh-rate-item {
          font-family: ${SANS};
          font-size: 0.86rem;
          color: ${INK_2};
          margin: 16px 0 20px;
        }
        .lh-rate-rows {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .lh-rate-row {
          display: grid;
          grid-template-columns: 4.5rem 1fr auto 3.5rem;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid ${RULE};
          opacity: 0;
          transform: translateX(-8px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .lh-rate-in .lh-rate-row {
          opacity: 1;
          transform: translateX(0);
        }
        .lh-rate-city {
          font-family: ${SANS};
          font-size: 0.85rem;
          color: ${INK};
        }
        .lh-rate-bar {
          display: block;
          height: 3px;
          background: rgba(11, 31, 58, 0.06);
        }
        .lh-rate-bar i {
          display: block;
          height: 100%;
          background: ${TERRACOTTA};
          opacity: 0.5;
          transition: width 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.4s;
        }
        .lh-rate-row-best .lh-rate-bar i {
          background: ${GREEN};
          opacity: 1;
        }
        .lh-rate-value {
          font-family: ${MONO};
          font-size: 0.9rem;
          font-variant-numeric: tabular-nums;
          color: ${INK};
        }
        .lh-rate-row-best .lh-rate-value {
          color: ${GREEN};
        }
        .lh-rate-delta {
          font-family: ${MONO};
          font-size: 0.72rem;
          font-variant-numeric: tabular-nums;
          text-align: right;
          color: ${TERRACOTTA};
        }
        .lh-rate-row-best .lh-rate-delta {
          color: ${GREEN};
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 0.65rem;
        }
        .lh-rate-foot {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-top: 18px;
        }
        .lh-rate-foot-label {
          font-family: ${SANS};
          font-size: 0.7rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${INK_3};
        }
        .lh-rate-foot-value {
          font-family: ${MONO};
          font-size: 1.4rem;
          font-variant-numeric: tabular-nums;
          color: ${GOLD_DEEP};
        }

        @media (prefers-reduced-motion: reduce) {
          .lh-rate,
          .lh-rate-row {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .lh-rate-bar i {
            transition: none;
          }
        }
      `}</style>
    </figure>
  );
};

export default RateCard;
