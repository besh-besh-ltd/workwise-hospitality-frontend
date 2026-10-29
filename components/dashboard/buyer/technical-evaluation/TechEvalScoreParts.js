import React from 'react';
import { BsShieldCheck } from 'react-icons/bs';
import styles from './TechnicalEvaluation.module.scss';

export const PassingScoreLabel = ({ minimumPassingScore }) => (
  <div className={styles.passingScore}>
    <div className={styles.passingScoreIcon}>
      <BsShieldCheck size={13} />
    </div>
    <span><strong>Minimum passing score:</strong> {minimumPassingScore}%</span>
  </div>
);

export const VendorScoreValue = ({ score }) => (
  <span className={styles.vendorScore}>{score}%</span>
);
