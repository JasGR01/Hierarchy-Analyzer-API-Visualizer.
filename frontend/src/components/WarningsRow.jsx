import styles from "./WarningsRow.module.css";

/**
 * WarningsRow
 * Shows invalid_entries and duplicate_edges as pill grids.
 * Returns null if both arrays are empty.
 */
export default function WarningsRow({ invalidEntries, duplicateEdges }) {
  const hasInvalid    = invalidEntries.length > 0;
  const hasDuplicates = duplicateEdges.length > 0;

  if (!hasInvalid && !hasDuplicates) return null;

  return (
    <div className={styles.row}>
      {hasInvalid && (
        <div className={`${styles.block} ${styles.invalidBlock}`}>
          <p className={`${styles.blockTitle} ${styles.invalidTitle}`}>
            <span aria-hidden="true">⛔</span>
            Invalid Entries
            <span className={styles.count}>{invalidEntries.length}</span>
          </p>
          <div className={styles.pills}>
            {invalidEntries.map((entry, i) => (
              <span key={i} className={`${styles.pill} ${styles.pillInvalid} mono`}>
                {entry === "" ? <em>(empty)</em> : entry}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasDuplicates && (
        <div className={`${styles.block} ${styles.duplicateBlock}`}>
          <p className={`${styles.blockTitle} ${styles.duplicateTitle}`}>
            <span aria-hidden="true">⚠️</span>
            Duplicate / Conflict Edges
            <span className={styles.count}>{duplicateEdges.length}</span>
          </p>
          <div className={styles.pills}>
            {duplicateEdges.map((entry, i) => (
              <span key={i} className={`${styles.pill} ${styles.pillDuplicate} mono`}>
                {entry}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
