import { useState, useCallback } from 'react';

export interface AnalysisRecord {
  txHash: string;
  score: number;
  tierName: string;
  timestamp: number;
  network: string;
}

const STORAGE_KEY = 'poa_history';
const MAX_RECORDS = 10;

function loadHistory(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalysisRecord[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(records: AnalysisRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

export function useAnalysisHistory() {
  const [history, setHistory] = useState<AnalysisRecord[]>(loadHistory);

  const addRecord = useCallback((record: Omit<AnalysisRecord, 'timestamp'>) => {
    setHistory((prev) => {
      const updated = [
        { ...record, timestamp: Date.now() },
        ...prev.filter((r) => r.txHash !== record.txHash),
      ].slice(0, MAX_RECORDS); // FIFO — keep newest MAX_RECORDS
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return { history, addRecord, clearHistory };
}
