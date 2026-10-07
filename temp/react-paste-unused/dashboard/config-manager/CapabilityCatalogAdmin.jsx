import { useEffect, useState } from 'react';
import {
  fetchCapabilityCatalogDocument,
  saveCapabilityCatalogDocument
} from '../../editor/capabilities/fetchCapabilityCatalogRows.js';

const ALLOWS = ['db', 'hybrid', 'xml'];
const RULE_TYPES = ['role', 'disallow', 'sendId'];

function emptyModule() {
  return {
    id: '',
    show: true,
    allow: 'db',
    scope: '',
    button: { id: '', show: true },
    contextMenu: { id: '', label: '', show: false },
    rules: []
  };
}

export default function CapabilityCatalogAdmin() {
  const [modules, setModules] = useState([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCapabilityCatalogDocument()
      .then((document) => {
        if (!cancelled) setModules(document.modules || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateModule = (index, patch) => {
    setModules((current) => current.map((mod, i) => (i === index ? { ...mod, ...patch } : mod)));
  };

  const updateRule = (moduleIndex, ruleIndex, patch) => {
    setModules((current) => current.map((mod, i) => {
      if (i !== moduleIndex) return mod;
      return {
        ...mod,
        rules: mod.rules.map((rule, j) => (j === ruleIndex ? { ...rule, ...patch } : rule))
      };
    }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const saved = await saveCapabilityCatalogDocument({
        modules: modules.map((mod) => ({
          ...mod,
          scope: mod.scope || null,
          button: mod.button?.id ? mod.button : null,
          contextMenu: mod.contextMenu?.id ? mod.contextMenu : null,
          rules: (mod.rules || []).map((rule) => ({
            ...rule,
            client: rule.client || null
          }))
        }))
      });
      setModules(saved.modules || []);
      setStatus('Saved. The next editor catalog load will use these rows.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Capability catalog</h2>
        <p className="text-sm text-gray-600">
          Edits modules, buttons, context menus, and rules. Roles and clients are lookup data and are not changed here.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {status && <p className="text-sm text-green-700">{status}</p>}
      {modules.map((mod, index) => (
        <section key={`${mod.id}-${index}`} className="rounded border border-gray-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap gap-3">
            <label className="text-sm">
              Id
              <input
                className="ml-2 rounded border px-2 py-1"
                value={mod.id}
                onChange={(event) => updateModule(index, { id: event.target.value })}
              />
            </label>
            <label className="text-sm">
              Allow
              <select
                className="ml-2 rounded border px-2 py-1"
                value={mod.allow}
                onChange={(event) => updateModule(index, { allow: event.target.value })}
              >
                {ALLOWS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Scope
              <input
                className="ml-2 rounded border px-2 py-1"
                value={mod.scope || ''}
                onChange={(event) => updateModule(index, { scope: event.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(mod.show)}
                onChange={(event) => updateModule(index, { show: event.target.checked })}
              />
              Show module
            </label>
          </div>
          <div className="mb-2 flex flex-wrap gap-3 text-sm">
            <label>
              Button id
              <input
                className="ml-2 rounded border px-2 py-1"
                value={mod.button?.id || ''}
                onChange={(event) => updateModule(index, { button: { ...mod.button, id: event.target.value, show: mod.button?.show !== false } })}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mod.button?.show !== false}
                onChange={(event) => updateModule(index, { button: { ...mod.button, show: event.target.checked } })}
              />
              Show button
            </label>
            <label>
              Menu id
              <input
                className="ml-2 rounded border px-2 py-1"
                value={mod.contextMenu?.id || ''}
                onChange={(event) => updateModule(index, {
                  contextMenu: { ...mod.contextMenu, id: event.target.value, label: mod.contextMenu?.label || '', show: Boolean(mod.contextMenu?.show) }
                })}
              />
            </label>
            <label>
              Menu label
              <input
                className="ml-2 rounded border px-2 py-1"
                value={mod.contextMenu?.label || ''}
                onChange={(event) => updateModule(index, { contextMenu: { ...mod.contextMenu, label: event.target.value } })}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(mod.contextMenu?.show)}
                onChange={(event) => updateModule(index, { contextMenu: { ...mod.contextMenu, show: event.target.checked } })}
              />
              Show menu
            </label>
          </div>
          {(mod.rules || []).map((rule, ruleIndex) => (
            <div key={ruleIndex} className="mb-1 flex flex-wrap gap-2 text-sm">
              <input
                className="rounded border px-2 py-1"
                placeholder="client (empty = all)"
                value={rule.client || ''}
                onChange={(event) => updateRule(index, ruleIndex, { client: event.target.value })}
              />
              <select
                className="rounded border px-2 py-1"
                value={rule.rule_type}
                onChange={(event) => updateRule(index, ruleIndex, { rule_type: event.target.value })}
              >
                {RULE_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <input
                className="rounded border px-2 py-1"
                value={rule.value || ''}
                onChange={(event) => updateRule(index, ruleIndex, { value: event.target.value })}
              />
              <button
                type="button"
                className="text-red-600"
                onClick={() => updateModule(index, { rules: mod.rules.filter((_, j) => j !== ruleIndex) })}
              >
                Remove rule
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-orange-700"
            onClick={() => updateModule(index, { rules: [...(mod.rules || []), { client: '', rule_type: 'role', value: '' }] })}
          >
            Add rule
          </button>
        </section>
      ))}
      <div className="flex gap-3">
        <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => setModules((current) => [...current, emptyModule()])}>
          Add module
        </button>
        <button type="button" className="rounded bg-orange-600 px-3 py-1 text-sm text-white" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save catalog'}
        </button>
      </div>
    </div>
  );
}
