import styles from "./InputPanel.module.css";

const EXAMPLES = {
  "Simple Tree":    "A->B\nA->C\nB->D",
  "Multiple Trees": "A->B\nA->C\nD->E\nD->F\nF->G",
  "With Cycle":     "A->B\nB->C\nC->A\nD->E",
  "Mixed":          "A->B\nA->C\nB->D\nC->D\nhello\n1->2\nA->B",
};

/**
 * InputPanel
 * Owns the textarea, example presets, submit/clear buttons,
 * and the keyboard shortcut (Ctrl/Cmd + Enter).
 */
export default function InputPanel({ inputText, onChange, onSubmit, onClear, onLoadExample, isLoading }) {
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="input-heading">
      <div className={styles.header}>
        <h1 id="input-heading" className={styles.title}>Submit Node Edges</h1>
        <p className={styles.subtitle}>
          Enter edges in the format <code>X-&gt;Y</code> — one per line or comma-separated.
          X and Y must be single uppercase letters (A–Z).
        </p>
      </div>

      {/* Textarea */}
      <div className={styles.fieldGroup}>
        <label htmlFor="edge-input" className={styles.label}>Edge List</label>
        <textarea
          id="edge-input"
          className={styles.textarea}
          value={inputText}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={"A->B\nA->C\nB->D"}
          rows={8}
          spellCheck={false}
          aria-describedby="edge-input-hint"
          disabled={isLoading}
        />
        <p id="edge-input-hint" className={styles.hint}>
          Tip: <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to submit
        </p>
      </div>

      {/* Example presets */}
      <div className={styles.exampleRow} role="group" aria-label="Example presets">
        <span className={styles.exampleLabel}>Try an example:</span>
        {Object.entries(EXAMPLES).map(([label, text]) => (
          <button
            key={label}
            className={styles.exampleBtn}
            onClick={() => onLoadExample(text)}
            disabled={isLoading}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.submitBtn}
          onClick={onSubmit}
          disabled={isLoading}
          type="button"
          aria-busy={isLoading}
          id="submit-btn"
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Analysing…
            </>
          ) : (
            <>Analyse Edges <span aria-hidden="true">→</span></>
          )}
        </button>

        <button
          className={styles.clearBtn}
          onClick={onClear}
          disabled={isLoading}
          type="button"
          id="clear-btn"
        >
          Clear
        </button>
      </div>
    </section>
  );
}
