/**
 * useAnalyser.js
 * Custom hook that owns all state for the BFHL form:
 *   input text, loading flag, error message, and the last API result.
 *
 * Returns everything the UI needs; keeps App.jsx a pure render concern.
 */

import { useState, useCallback } from "react";
import { analyseEdges } from "../api";

export function useAnalyser() {
  const [inputText, setInputText]   = useState("");
  const [status,    setStatus]      = useState("idle"); // idle | loading | success | error
  const [errorMsg,  setErrorMsg]    = useState("");
  const [result,    setResult]      = useState(null);

  /**
   * Parse the textarea text into the data array the API expects.
   * Accepts lines or comma-separated values; strips empties after trim.
   */
  function parseInput(raw) {
    return raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  const submit = useCallback(async () => {
    const data = parseInput(inputText);

    if (data.length === 0) {
      setStatus("error");
      setErrorMsg("Please enter at least one edge string.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");
    setResult(null);

    try {
      const json = await analyseEdges(data);
      setResult(json);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  }, [inputText]);

  const clear = useCallback(() => {
    setInputText("");
    setStatus("idle");
    setErrorMsg("");
    setResult(null);
  }, []);

  const loadExample = useCallback((text) => {
    setInputText(text);
    setStatus("idle");
    setErrorMsg("");
    setResult(null);
  }, []);

  return { inputText, setInputText, status, errorMsg, result, submit, clear, loadExample };
}
