import React from "react";
import s from "./SkeletonLoader.module.scss";

const SkeletonLoader = ({ variant = "dashboard" }) => {
  return (
    <div>
      {variant === "dashboard" && (
        <>
          <div className={s.dashboardHeader}>
            <div className={s.pills}>
              <div className={`${s.bone} ${s.pill}`} />
              <div className={`${s.bone} ${s.pill}`} style={{ width: 100, animationDelay: "0.1s" }} />
              <div className={`${s.bone} ${s.pill}`} style={{ width: 60, animationDelay: "0.2s" }} />
            </div>
            <div className={s.bone} style={{ width: 140, height: 36, borderRadius: 8 }} />
          </div>
          {[0, 1].map((i) => (
            <div key={i} className={s.card}>
              <div className={`${s.bone} ${s.cardAccent}`} style={{ animationDelay: `${i * 0.15}s` }} />
              <div className={s.cardHeader}>
                <div>
                  <div className={s.bone} style={{ width: 160, height: 18, marginBottom: 8, animationDelay: `${i * 0.15 + 0.05}s` }} />
                  <div className={s.bone} style={{ width: 200, height: 12, animationDelay: `${i * 0.15 + 0.1}s` }} />
                </div>
                <div className="d-flex gap-1">
                  <div className={s.bone} style={{ width: 32, height: 32, borderRadius: 8 }} />
                  <div className={s.bone} style={{ width: 32, height: 32, borderRadius: 8, animationDelay: "0.1s" }} />
                </div>
              </div>
              <div className={s.bone} style={{ width: "60%", height: 10, margin: "0 18px 8px", animationDelay: `${i * 0.15 + 0.1}s` }} />
              <div className={s.cardPipeline}>
                {[0, 1, 2, 3, 4].map((j) => (
                  <React.Fragment key={j}>
                    <div className={s.stageWrap}>
                      <div className={`${s.bone} ${s.stageCircle}`} style={{ animationDelay: `${i * 0.15 + j * 0.08}s` }} />
                      <div className={`${s.bone} ${s.stageLabel}`} style={{ animationDelay: `${i * 0.15 + j * 0.08 + 0.04}s` }} />
                    </div>
                    {j < 4 && <div className={`${s.bone} ${s.rail}`} style={{ animationDelay: `${i * 0.15 + j * 0.08 + 0.02}s` }} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      {variant === "wizard" && (
        <div className={s.wizard}>
          <div className={s.wizStepper}>
            <div className={s.bone} style={{ width: 200, height: 14 }} />
            <div className={s.wizSteps}>
              {[0, 1, 2].map((i) => (
                <React.Fragment key={i}>
                  <div className={s.wizStep}>
                    <div className={`${s.bone} ${s.wizCircle}`} style={{ animationDelay: `${i * 0.1}s` }} />
                    <div className={s.bone} style={{ width: 60, height: 10, animationDelay: `${i * 0.1 + 0.05}s` }} />
                  </div>
                  {i < 2 && <div className={`${s.bone} ${s.wizConnector}`} style={{ animationDelay: `${i * 0.1 + 0.02}s` }} />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className={s.wizBody}>
            <div className={s.wizBlock}>
              <div className={s.bone} style={{ width: 180, height: 20, marginBottom: 8 }} />
              <div className={s.bone} style={{ width: "80%", height: 12, marginBottom: 20 }} />
            </div>
            <div className={s.bone} style={{ width: "100%", height: 56, borderRadius: 10, marginBottom: 12 }} />
            <div className={s.bone} style={{ width: "100%", height: 56, borderRadius: 10, marginBottom: 12, animationDelay: "0.1s" }} />
            <div className={s.bone} style={{ width: "100%", height: 56, borderRadius: 10, animationDelay: "0.2s" }} />
          </div>
          <div className={s.wizFooter}>
            <div className={s.bone} style={{ width: 80, height: 36, borderRadius: 8 }} />
            <div className="d-flex gap-2">
              <div className={s.bone} style={{ width: 80, height: 36, borderRadius: 8, animationDelay: "0.1s" }} />
              <div className={s.bone} style={{ width: 100, height: 36, borderRadius: 8, animationDelay: "0.15s" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkeletonLoader;
