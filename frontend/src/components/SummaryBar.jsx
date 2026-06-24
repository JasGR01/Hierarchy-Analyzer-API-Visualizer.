import styles from "./SummaryBar.module.css";

/**
 * SummaryBar
 * Three stat tiles: total trees, total cycles, and the largest tree root.
 */
export default function SummaryBar({ totalTrees, totalCycles, largestRoot }) {
  const stats = [
    { value: totalTrees,             label: "Trees",        accent: "green"  },
    { value: totalCycles,            label: "Cycles",       accent: "red"    },
    { value: largestRoot ?? "—",     label: "Largest Root", accent: "accent" },
  ];

  return (
    <div className={styles.bar} role="region" aria-label="Summary statistics">
      {stats.map(({ value, label, accent }) => (
        <div key={label} className={`${styles.stat} ${styles[accent]}`}>
          <span className={styles.value}>{value}</span>
          <span className={styles.label}>{label}</span>
        </div>
      ))}
    </div>
  );
}
