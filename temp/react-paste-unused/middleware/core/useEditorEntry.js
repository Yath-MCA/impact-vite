import { useEffect, useMemo, useState } from 'react';
import { resolveEditorEntryState, verifyEditorEntry } from './editorEntry.js';

const INITIAL_STATE = {
  loading: true,
  entryReady: false,
  ready: false,
  error: null,
  session: null
};

export function useEditorEntry(options = {}) {
  const stableOptions = useMemo(() => ({
    docId: options.docId || '',
    locationSearch: options.locationSearch,
    allowRecovery: options.allowRecovery !== false
  }), [options.docId, options.locationSearch, options.allowRecovery]);

  const [state, setState] = useState(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;
    setState(INITIAL_STATE);

    (async () => {
      const entry = await resolveEditorEntryState(stableOptions);
      if (cancelled) return;

      if (!entry.ok) {
        setState({ loading: false, entryReady: false, ready: false, error: entry, session: null });
        return;
      }

      // Steps 1-5 resolved: expose entryReady so callers (EditorPage's content/config
      // loading hooks) can start work while verify runs in the background.
      setState({ loading: false, entryReady: true, ready: false, error: null, session: entry });

      const verify = await verifyEditorEntry(entry);
      if (cancelled) return;

      if (!verify.ok) {
        setState({ loading: false, entryReady: true, ready: false, error: verify, session: entry });
        return;
      }

      setState({
        loading: false,
        entryReady: true,
        ready: true,
        error: null,
        session: { ...entry, bypassed: verify.bypassed === true }
      });
    })().catch((error) => {
      if (cancelled) return;
      setState({
        loading: false,
        entryReady: false,
        ready: false,
        error: {
          reason: 'bootstrap_error',
          message: error?.message || 'Unable to initialize editor session.',
          redirectTo: '/validateurl'
        },
        session: null
      });
    });

    return () => {
      cancelled = true;
    };
  }, [stableOptions]);

  return state;
}
