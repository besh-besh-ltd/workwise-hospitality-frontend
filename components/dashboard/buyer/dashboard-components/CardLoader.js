import React from "react";
import styles from "./CardLoader.module.scss";

const CardLoader = () => {
  return (
    <div className={styles.overlay}>
      <div className={styles.loaderContent}>
        <div className={styles.spinner} />
        <span className={styles.text}>Fetching data...</span>
      </div>
    </div>
  );
};

export default CardLoader;
