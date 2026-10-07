import { useState, useEffect, useContext, useRef, useCallback } from "react";
import apiService from "../../../services/api/apiService";
import DashboardContext from "../context/DashboardContext";

/** Shared across StrictMode remounts so initial getDocs is requested once per range key. */
const fileslistInflight = new Map();

function getOrCreateFileslistRequest(cacheKey, payload) {
  const existing = fileslistInflight.get(cacheKey);
  if (existing) return existing;

  const request = apiService.getDocs(payload).finally(() => {
    fileslistInflight.delete(cacheKey);
  });

  fileslistInflight.set(cacheKey, request);
  return request;
}

export default function DashboardHeader({ onDataFetched }) {
  const { setRowData, setFetchLoading } = useContext(DashboardContext);

  // Default to last 3 days (inclusive)
  const today = new Date();
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(today.getDate() - 2);
  const format = d => d.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(format(threeDaysAgo));
  const [endDate, setEndDate] = useState(format(today));
  const [client, setClient] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const clientOptions = ["all", "oup", "plos", "medknow", "brill"];

  const fetchData = useCallback(async ({ dedupe = false } = {}) => {
    setLoading(true);
    setFetchLoading(true);
    try {
      const payload = {
        tbl: "Fileslist",
        find: {
          client: { $regex: '[A-z]+', $options: 'i' },
          linkinfo: { $exists: true },
          projecttitle: { $exists: true },
          time_c: { $gte: new Date(startDate).getTime(), $lte: new Date(endDate).getTime() }
        },
        sort: { time_c: -1 }
      };

      const cacheKey = `${payload.find.time_c.$gte}:${payload.find.time_c.$lte}`;
      const data = dedupe
        ? await getOrCreateFileslistRequest(cacheKey, payload)
        : await apiService.getDocs(payload);

      if (!mountedRef.current) return;

      const rows = Array.isArray(data) ? data : (data?.data ?? []);

      // Push into shared context
      setRowData(rows);

      // Backward-compat callback
      if (onDataFetched) onDataFetched(rows);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error(e);
      alert(e.message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setFetchLoading(false);
      }
    }
  }, [startDate, endDate, setRowData, setFetchLoading, onDataFetched]);

  // initial load for default range (deduped under StrictMode remount)
  useEffect(() => {
    mountedRef.current = true;
    fetchData({ dedupe: true });
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      {/* Date range */}
      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium">From</label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="rounded border px-2 py-1 dark:bg-gray-700" />
        <label className="text-sm font-medium">To</label>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="rounded border px-2 py-1 dark:bg-gray-700" />
      </div>

      {/* Client dropdown */}
      <select value={client} onChange={e => setClient(e.target.value)}
        className="rounded border px-2 py-1 dark:bg-gray-700">
        {clientOptions.map(opt => (
          <option key={opt} value={opt}>{opt.toUpperCase()}</option>
        ))}
      </select>

      {/* Search input */}
      <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
        className="flex-1 rounded border px-2 py-1 dark:bg-gray-700" />

      {/* Fetch button — intentional user click; no StrictMode dedupe */}
      <button onClick={() => fetchData({ dedupe: false })} disabled={loading}
        className={`btn-primary ${loading ? "opacity-60 cursor-not-allowed" : ""}`}>
        {loading ? "Loading…" : "Fetch"}
      </button>
    </div>
  );
}
