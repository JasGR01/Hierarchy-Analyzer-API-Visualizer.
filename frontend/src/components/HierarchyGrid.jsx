import styles from "./HierarchyGrid.module.css";

/* ─── Tree renderer ────────────────────────────────────────── */

/**
 * Recursively renders the nested tree object as ASCII connector lines.
 * Returns a flat array of <div> rows for the container.
 */
function TreeLines({ node, treeObj, prefix = "", isLast = true }) {
  const connector   = isLast ? "└─ " : "├─ ";
  const childPrefix = prefix + (isLast ? "   " : "│  ");
  const children    = Object.keys(treeObj[node] ?? {});
  const hasChildren = children.length > 0;

  return (
    <>
      <div className={styles.treeLine}>
        <span className={styles.treeConnector}>{prefix + connector}</span>
        <span className={`${styles.treeNode} ${!hasChildren ? styles.leaf : ""}`}>
          {node}
        </span>
      </div>
      {children.map((child, i) => (
        <TreeLines
          key={child}
          node={child}
          treeObj={treeObj[node]}
          prefix={childPrefix}
          isLast={i === children.length - 1}
        />
      ))}
    </>
  );
}

/* ─── Single hierarchy card ────────────────────────────────── */

function HierarchyCard({ hierarchy, index }) {
  const { root, tree, depth, has_cycle: isCycle } = hierarchy;
  const childKeys = Object.keys(tree ?? {});

  return (
    <article
      className={`${styles.card} ${isCycle ? styles.cycleCard : ""}`}
      style={{ animationDelay: `${index * 55}ms` }}
      aria-label={`${isCycle ? "Cyclic group" : "Tree"} rooted at ${root}`}
    >
      {/* Header */}
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.rootLabel}>Root</p>
          <p className={`${styles.rootNode} ${isCycle ? styles.cycleRoot : ""} mono`}>
            {root}
          </p>
        </div>
        {isCycle ? (
          <span className={styles.cycleBadge}>Cycle</span>
        ) : (
          <span className={styles.depthBadge}>depth {depth}</span>
        )}
      </div>

      {/* Tree visualisation */}
      <div className={styles.treeVis} aria-label="Tree structure">
        {isCycle ? (
          <p className={styles.cycleNote}>⟳ Cyclic group — no tree structure</p>
        ) : childKeys.length === 0 ? (
          <p className={styles.leafNote}>Isolated leaf node</p>
        ) : (
          childKeys.map((child, i) => (
            <TreeLines
              key={child}
              node={child}
              treeObj={tree}
              prefix=""
              isLast={i === childKeys.length - 1}
            />
          ))
        )}
      </div>
    </article>
  );
}

/* ─── Grid wrapper ─────────────────────────────────────────── */

/**
 * HierarchyGrid
 * Renders all hierarchy objects returned by the API in a responsive grid.
 */
export default function HierarchyGrid({ hierarchies }) {
  if (!hierarchies || hierarchies.length === 0) return null;

  const trees  = hierarchies.filter((h) => !h.has_cycle);
  const cycles = hierarchies.filter((h) =>  h.has_cycle);

  return (
    <section aria-labelledby="hier-heading">
      <div className={styles.sectionHeader}>
        <h2 id="hier-heading" className={styles.sectionTitle}>Hierarchies</h2>
        <span className={styles.badge}>{hierarchies.length}</span>
      </div>

      {/* Trees */}
      {trees.length > 0 && (
        <>
          <p className={styles.groupLabel}>Trees ({trees.length})</p>
          <div className={styles.grid}>
            {trees.map((h, i) => (
              <HierarchyCard key={h.root} hierarchy={h} index={i} />
            ))}
          </div>
        </>
      )}

      {/* Cycles */}
      {cycles.length > 0 && (
        <>
          <p className={`${styles.groupLabel} ${styles.cycleLabel}`}>
            Cyclic Groups ({cycles.length})
          </p>
          <div className={styles.grid}>
            {cycles.map((h, i) => (
              <HierarchyCard key={h.root} hierarchy={h} index={trees.length + i} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
