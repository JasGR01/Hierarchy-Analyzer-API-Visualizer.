import { useAnalyser }   from "./hooks/useAnalyser";
import InputPanel        from "./components/InputPanel";
import StatusBanner      from "./components/StatusBanner";
import IdentityCard      from "./components/IdentityCard";
import SummaryBar        from "./components/SummaryBar";
import WarningsRow       from "./components/WarningsRow";
import HierarchyGrid     from "./components/HierarchyGrid";
import styles            from "./App.module.css";

export default function App() {
  const {
    inputText, setInputText,
    status, errorMsg, result,
    submit, clear, loadExample,
  } = useAnalyser();

  const isLoading = status === "loading";
  const showResult = status === "success" && result !== null;

  return (
    <div className={styles.layout}>
      {/* ── Header ──────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.logo}>
            <span className={styles.logoIcon} aria-hidden="true">⬡</span>
            <span className={styles.logoText}>
              BFHL<span className={styles.logoAccent}>API</span>
            </span>
          </div>
          <p className={styles.headerTag}>
            Node Hierarchy Analyser &nbsp;·&nbsp; Chitkara Full Stack Challenge
          </p>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className={styles.container} id="main-content">

        {/* Input form */}
        <InputPanel
          inputText={inputText}
          onChange={setInputText}
          onSubmit={submit}
          onClear={clear}
          onLoadExample={loadExample}
          isLoading={isLoading}
        />

        {/* Status feedback */}
        <StatusBanner
          status={status}
          errorMsg={errorMsg}
          resultCount={result?.hierarchies?.length ?? 0}
        />

        {/* Results — only rendered after a successful response */}
        {showResult && (
          <section className={styles.results} aria-label="Analysis results">
            <IdentityCard
              userId={result.user_id}
              emailId={result.email_id}
              rollNumber={result.college_roll_number}
            />

            <SummaryBar
              totalTrees={result.summary.total_trees}
              totalCycles={result.summary.total_cycles}
              largestRoot={result.summary.largest_tree_root}
            />

            <WarningsRow
              invalidEntries={result.invalid_entries}
              duplicateEdges={result.duplicate_edges}
            />

            <HierarchyGrid hierarchies={result.hierarchies} />
          </section>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <p>
            Chitkara Full Stack Engineering Challenge &nbsp;·&nbsp;
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
