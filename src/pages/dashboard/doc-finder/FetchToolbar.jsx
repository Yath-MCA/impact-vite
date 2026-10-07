import React from 'react';

export default function FetchToolbar({ onFetch, page, setPage, limit, setLimit, loading }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8 }}>
      <button onClick={() => onFetch(0)} style={{ background: '#ff8635', color: '#fff', padding: '6px 12px', border: 'none' }} disabled={loading}>Fetch</button>
      <label>Limit:</label>
      <select value={limit} onChange={e=>setLimit(Number(e.target.value))}>
        <option value={10}>10</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
      </select>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Prev</button>
        <span>Page {page + 1}</span>
        <button onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
