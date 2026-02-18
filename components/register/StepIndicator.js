import React from "react";
import { BsCheckLg } from "react-icons/bs";
import styles from "./Register.module.css";

const StepIndicator = ({ currentStep, steps }) => {
  return (
    <div className={styles.stepper}>
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.key;
        const isActive = currentStep === step.key;
        const showConnector = index < steps.length - 1;

        const circleClass = [
          styles.stepCircle,
          isCompleted ? styles.completed : "",
          isActive ? styles.active : "",
          !isCompleted && !isActive ? styles.pending : "",
        ]
          .filter(Boolean)
          .join(" ");

        const labelClass = [
          styles.stepLabel,
          isCompleted ? styles.completed : "",
          isActive ? styles.active : "",
        ]
          .filter(Boolean)
          .join(" ");

        const connectorClass = [
          styles.stepConnector,
          isCompleted ? styles.completed : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <React.Fragment key={step.key}>
            <div className={styles.stepItem}>
              <div className={circleClass}>
                {isCompleted ? <BsCheckLg size={14} /> : step.key}
              </div>
              <div className={labelClass}>{step.label}</div>
            </div>
            {showConnector && <div className={connectorClass} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;
