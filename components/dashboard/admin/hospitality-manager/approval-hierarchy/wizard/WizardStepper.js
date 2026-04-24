import React from "react";
import { BsCheckLg } from "react-icons/bs";
import s from "./WizardStepper.module.scss";

const steps = [
  { key: 1, label: "Select Process" },
  { key: 2, label: "Configure Stages" },
  { key: 3, label: "Review & Save" },
];

const WizardStepper = ({ currentStep }) => {
  const activeLabel = steps.find((st) => st.key === currentStep)?.label || "";

  return (
    <div className={s.wrap}>
      <div className={s.context}>
        <div className={s.contextStep}>Step {currentStep} of {steps.length}</div>
        <div className={s.contextTitle}>{activeLabel}</div>
      </div>
      <div className={s.track}>
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.key;
          const isActive = currentStep === step.key;
          const isLast = index === steps.length - 1;

          const connCls = [s.connector, isCompleted ? s.connectorCompleted : isActive ? s.connectorActive : ""].filter(Boolean).join(" ");
          const circleCls = [s.circle, isCompleted ? s.circleCompleted : isActive ? s.circleActive : s.circlePending].join(" ");
          const labelCls = [s.label, isCompleted ? s.labelCompleted : isActive ? s.labelActive : ""].filter(Boolean).join(" ");

          return (
            <div key={step.key} className={s.item}>
              {!isLast && <div className={connCls} />}
              <div className={circleCls}>
                {isCompleted ? <BsCheckLg size={16} /> : step.key}
              </div>
              <span className={labelCls}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WizardStepper;
