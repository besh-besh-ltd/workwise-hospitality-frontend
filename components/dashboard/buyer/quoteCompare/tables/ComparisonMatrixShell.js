import React from "react";
import styles from "./QuoteCompareTables.module.scss";

const ComparisonMatrixShell = ({
  title,
  subtitle,
  legend = [],
  headerActions = null,
  borderless = false,
  className = "",
  children,
}) => {
  return (
    <section className={`${styles.matrixSurface} ${borderless ? styles.matrixSurfaceBorderless : ""} ${className}`}>
      {(title || subtitle || legend?.length > 0 || headerActions) ? (
        <header className={styles.matrixHeader}>
          <div className={styles.headerTopRow}>
            <div>
              {title ? <h4 className={styles.matrixTitle}>{title}</h4> : null}
              {subtitle ? <p className={styles.matrixSubTitle}>{subtitle}</p> : null}
            </div>
            {headerActions ? <div className={styles.headerActions}>{headerActions}</div> : null}
          </div>

          {legend?.length > 0 ? (
            <div className={styles.legendBar}>
              {legend.map((item) => (
                <span key={item.label} className={`${styles.legendItem} ${styles[`legend_${item.key}`] || ""}`}>
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
};

export default ComparisonMatrixShell;
