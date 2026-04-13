import React from "react";
import { FiCheck } from "react-icons/fi";
import styles from "./Register.module.css";

const STEPS = [
  { key: "uploading", label: "Uploading Documents" },
  { key: "registering", label: "Registering User Account" },
  { key: "authenticating", label: "Setting Up Your Profile" },
  { key: "payment", label: "Initiating Payment" },
];

const RegistrationProgressBanner = ({ currentStep }) => {
  if (!currentStep) return null;

  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className={styles.regProgressBanner}>
      <div className={styles.regProgressInner}>
        <div className={styles.regProgressHeader}>
          <div className={styles.regProgressDot} />
          <span>Please wait while we set everything up</span>
        </div>

        <div className={styles.regProgressSteps}>
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentIdx;
            const isActive = idx === currentIdx;
            const isPending = idx > currentIdx;

            return (
              <div
                key={step.key}
                className={`${styles.regProgressStep} ${
                  isCompleted ? styles.regProgressStepDone : ""
                } ${isActive ? styles.regProgressStepActive : ""} ${
                  isPending ? styles.regProgressStepPending : ""
                }`}
              >
                <div className={styles.regProgressStepIcon}>
                  {isCompleted ? (
                    <FiCheck size={14} />
                  ) : isActive ? (
                    <span className={styles.regProgressSpinner} />
                  ) : (
                    <span className={styles.regProgressStepNum}>{idx + 1}</span>
                  )}
                </div>
                <span className={styles.regProgressStepLabel}>
                  {isActive ? `${step.label}...` : step.label}
                </span>
              </div>
            );
          })}
        </div>

        <p className={styles.regProgressNote}>
          Please do not close this window or refresh the page.
        </p>
      </div>
    </div>
  );
};

export default RegistrationProgressBanner;
