import React, { useState, useEffect, useRef } from 'react';

// Simple debounce helper
function useDebouncedEffect(value, delay, callback) {
  const timer = useRef(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => callback(value), delay);
    return () => clearTimeout(timer.current);
  }, [value, delay, callback]);
}

export default function QueryBuilder({ value = {}, onChange }) {
  const [form, setForm] = useState({
    client: '',
    identifier: '',
    docid: '',
    status: '',
    titleinfoCover: '',
    rolename: '',
    raw: '',
    ...value
  });

  // useEffect(() => {
  //   setForm(f => ({ ...f, ...value }));
  // }, [value]);

  // build the find object synchronously from form
  const buildFind = (f) => {
    const find = {};
    if (f.client) find.client = f.client;
    if (f.identifier) find.identifier = f.identifier;
    if (f.docid) find.docid = f.docid;
    if (f.status) find.status = f.status;
    if (f.titleinfoCover) find['titleinfo.cover'] = f.titleinfoCover;
    if (f.rolename) find.rolename = f.rolename;

    let rawObj = {};
    if (f.raw) {
      try { rawObj = JSON.parse(f.raw); } catch (e) { /* ignore */ }
    }
    return { ...rawObj, ...find };
  };

  // Debounce propagation to parent to avoid rapid queries while typing
  useDebouncedEffect(form, 500, (latestForm) => {
    const find = buildFind(latestForm);
    onChange && onChange(find);
  });

  return (
    <div className="docfinder-querybuilder" style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input placeholder="client" value={form.client} onChange={e=>setForm({...form,client:e.target.value})} />
        <input placeholder="identifier" value={form.identifier} onChange={e=>setForm({...form,identifier:e.target.value})} />
        <input placeholder="docid" value={form.docid} onChange={e=>setForm({...form,docid:e.target.value})} />
        <input placeholder="status" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} />
        {/* <input placeholder="titleinfo.cover" value={form.titleinfoCover} onChange={e=>setForm({...form,titleinfoCover:e.target.value})} /> */}
        <input placeholder="rolename" value={form.rolename} onChange={e=>setForm({...form,rolename:e.target.value})} />
      </div>

      <div style={{ marginTop: 8 }}>
        <label style={{ display: 'block', fontSize: 12 }}>Raw JSON (merge with fields)</label>
        <textarea rows={4} style={{ width: '100%' }} value={form.raw} onChange={e=>setForm({...form,raw:e.target.value})} />
      </div>
    </div>
  );
}
