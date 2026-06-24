import styles from "./StatusBanner.module.css";

/**
 * StatusBanner
 * Shows a contextual message for loading, error, and success states.
 * Returns null for the idle state (invisible).
 */
export default function StatusBanner({ status, errorMsg, resultCount }) {
  if (status === "idle") return null;

  const config = {
    loading: {
      className: styles.loading,
      icon: <span className={styles.spinner} aria-hidden="true" />,
      text: "Analysing edges…",
    },
    error: {
      className: styles.error,
      icon: <span className={styles.icon}>✖</span>,
      text: errorMsg,
    },
    success: {
      className: styles.success,
      icon: <span className={styles.icon}>✓</span>,
      text: `Analysis complete — ${resultCount} group${resultCount !== 1 ? "s" : ""} found.`,
    },
  }[status];

  if (!config) return null;

  return (
    <div
      className={`${styles.banner} ${config.className}`}
      role={status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}
