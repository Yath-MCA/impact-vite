import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { Search, Database, AlertTriangle, FileX2, CheckCircle2 } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import { DOC_COLLECTIONS, EXCEPTION_COLLECTIONS } from '../../../shared/constants/docCollections';

const DEFAULT_IGNORED_COLUMNS = ['_r', '_w'];
const COMMON_METADATA_KEYS = [
    'client',
    'docid',
    'identifier',
    'dtd',
    'type',
    'division',
    'projecttitle',
    'linkinfo',
    'shorttitle',
    "mathwflow",
    "refstyle", "vendor", "sftpinpath", "collaborative", "mathwflowupdate", "journal_short_title", "journal_title", ""
];
const COMMON_METADATA_KEY_SET = new Set(COMMON_METADATA_KEYS);
const HIDDEN_UI_COLUMNS = new Set(['_r', '_w', '_sb', '_v', '_time_c', 'time_u', '_id', '_oid', "docid", "linkinfo", "time_c", "time_u", "timeiso_c", "titleinfo", "projecttitle", "dtd", "division", "type", "client", "identifier", "shorttitle", "editor", "taskid", "fileid", "xmltohtmlres", "manuscriptno", "projectid", "rurlvalidres", "rchatbotai", "rSandBox", "doctype", "emailtolist", "emailcclist", "emailbclist", "roletaskid", "roleabstracttaskid", "allroles", "wflow", "nextrole", "apikey", "vendor", "sftpinpath", "collaborative", "uid", "mathwflow", "refstyle", "__collection", "__id", "__v", "id", "key", "filename", "currenturl", "emailto", "comparestatus"]);

const EXCEPTION_COLLECTION_SET = new Set(EXCEPTION_COLLECTIONS);

const COLLECTION_CATEGORIES = {
    content: {
        label: 'Content & Files',
        items: new Set(['rCKFulltext', 'rFileslist', 'rattachmentlist', 'rfiles', 'rdocmodifieddata', 'rdoiinfo'])
    },
    user: {
        label: 'User & Auth',
        items: new Set(['rUserPreference', 'rUseraccess', 'rUsernotes', 'rShareandinvite', 'rlinksharing', 'rgeneratetoken', 'rdocviewhistory'])
    },
    workflow: {
        label: 'Workflow & Status',
        items: new Set(['rworkflow', 'rsignoffstatus', 'rpubkitapistatus', 'rpubkitapistatusclose', 'rimpactapistatusrecord'])
    },
    logs: {
        label: 'Logs & Errors',
        items: new Set(['rErrorLogs', 'rPasteLogs', 'rfilesaveerror', 'rhtmltoxmlerror', 'rhtmltoxmlparsingerror'])
    },
    technical: {
        label: 'System & Technical',
        items: new Set([]) // Will include everything else not specifically categorized
    }
};

const getCollectionCategory = (name) => {
    if (isExceptionCollection(name)) return 'exception';
    for (const [key, cat] of Object.entries(COLLECTION_CATEGORIES)) {
        if (cat.items.has(name)) return key;
    }
    return 'technical';
};

const isExceptionCollection = (name) => EXCEPTION_COLLECTION_SET.has(name);

const parseIgnoredColumnsInput = (value) =>
    value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const toDisplayText = (column, value) => {
    if (value == null) {
        return '';
    }

    if (column === 'timeiso_u') {
        const parsedDate = new Date(value);
        if (!Number.isNaN(parsedDate.getTime())) {
            return parsedDate.toLocaleString();
        }
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
};

const toSortableValue = (column, value) => {
    if (value == null) {
        return '';
    }

    if (column === 'timeiso_u') {
        const parsedDate = new Date(value);
        if (!Number.isNaN(parsedDate.getTime())) {
            return parsedDate.getTime();
        }
    }

    if (typeof value === 'number') {
        return value;
    }

    return toDisplayText(column, value).toLowerCase();
};

const expandRecordForTable = (collection, record) => {
    if (!record || typeof record !== 'object') {
        return [{ __collection: collection }];
    }

    if (record.recordtype !== 'open_close_dialog') {
        return [{ __collection: collection, ...record }];
    }

    const nestedArrayEntry = Object.entries(record).find(([, value]) =>
        Array.isArray(value) && value.length > 0 && value.every((item) => item && typeof item === 'object' && !Array.isArray(item))
    );

    if (!nestedArrayEntry) {
        return [{ __collection: collection, ...record }];
    }

    const [arrayKey, nestedRows] = nestedArrayEntry;
    const baseRecord = { ...record };
    delete baseRecord[arrayKey];

    return nestedRows.map((nestedItem, index) => ({
        __collection: collection,
        ...baseRecord,
        ...nestedItem,
        __rowindex: index + 1
    }));
};

const parseJsonPayload = (payload) => {
    const raw = typeof payload === 'string' ? payload.trim() : '';
    if (!raw) {
        return Array.isArray(payload) ? payload : payload ? [payload] : [];
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
        return [];
    }
};

const KEY_ALIASES = {
    docid: 'docid',
    manuscriptno: 'manuscriptno',
    identifier: 'identifier'
};

const SYNC_ENDPOINT =
    (typeof window !== 'undefined' && window.ENV && window.ENV.DOC_SYNC_URL)
        ? window.ENV.DOC_SYNC_URL
        : 'http://localhost:4444/sync-doc';

const HEALTH_ENDPOINT =
    (typeof window !== 'undefined' && window.ENV && window.ENV.DOC_SYNC_HEALTH_URL)
        ? window.ENV.DOC_SYNC_HEALTH_URL
        : SYNC_ENDPOINT.replace(/\/sync-doc\/?$/, '/health');

const SidebarCollectionItem = memo(function SidebarCollectionItem({ collection, checked, onToggle }) {
    return (
        <label
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
        >
            <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(collection)}
                className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-800 dark:text-gray-200">{collection.replace(/^r/, '')}</span>
        </label>
    );
});

const parseUserInput = (rawValue, selectedKey) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
        return { key: selectedKey, value: '' };
    }

    const keyValuePattern = /^([a-zA-Z_]+)\s*:\s*(.+)$/;
    const matched = trimmed.match(keyValuePattern);

    if (!matched) {
        return {
            key: selectedKey,
            value: trimmed.replace(/^['"]|['"]$/g, '').trim()
        };
    }

    const typedKey = (matched[1] || '').toLowerCase();
    const resolvedKey = KEY_ALIASES[typedKey] || selectedKey;
    const parsedValue = (matched[2] || '').replace(/^['"]|['"]$/g, '').trim();

    return {
        key: resolvedKey,
        value: parsedValue
    };
};

const resolveDocId = async (queryKey, queryValue) => {
    if (!queryValue) {
        return null;
    }

    if (queryKey === 'docid') {
        return queryValue;
    }

    try {
        const response = await axios.get('/snapshots/_lookup.json', {
            cache: 'no-store',
            validateStatus: () => true
        });
        if (response.status < 200 || response.status >= 300) {
            return null;
        }

        const lookup = response.data || {};
        const map = lookup?.[queryKey] || {};
        return map[String(queryValue).toLowerCase()] || null;
    } catch {
        return null;
    }
};

const runDocSync = async (queryKey, queryValue) => {
    const response = await axios.post(
        SYNC_ENDPOINT,
        {
            key: queryKey,
            value: queryValue
        },
        {
            headers: {
                'Content-Type': 'application/json'
            },
            validateStatus: () => true
        }
    );

    const payload = response.data && typeof response.data === 'object' ? response.data : {};

    if (response.status < 200 || response.status >= 300) {
        throw new Error(payload.error || `Sync failed (${response.status})`);
    }

    return payload.docid || null;
};

const fetchCollectionData = async ({ docId, collection }) => {
    const response = await axios.get(`/snapshots/${encodeURIComponent(docId)}/${collection}.json`, {
        cache: 'no-store',
        validateStatus: () => true
    });

    if (response.status === 404) {
        return [];
    }

    if (response.status < 200 || response.status >= 300) {
        throw new Error(`Failed to load ${collection} (${response.status})`);
    }

    return parseJsonPayload(response.data);
};

const initialSelection = DOC_COLLECTIONS.slice(0, 8).reduce((acc, name) => {
    acc[name] = true;
    return acc;
}, {});

export default function DocDashboard() {
    const isLocal = window.location.hostname === "localhost";
    const [docInput, setDocInput] = useState(isLocal ? "Ned9bfcfe-17b5-4f8c-9f2e-56006aed2df7" : "");
    const [inputKey, setInputKey] = useState('docid');
    const [activeDocId, setActiveDocId] = useState('');
    const [inputError, setInputError] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [backendConnected, setBackendConnected] = useState(false);
    const [backendPort, setBackendPort] = useState('---');
    const [searchTerm, setSearchTerm] = useState('');
    const [checked, setChecked] = useState(initialSelection);
    const [viewMode, setViewMode] = useState('cards');
    const [ignoredColumnsInput, setIgnoredColumnsInput] = useState(DEFAULT_IGNORED_COLUMNS.join(','));
    const [ignoreFromColumn, setIgnoreFromColumn] = useState('');
    const [ignoreToColumn, setIgnoreToColumn] = useState('');
    const [filterColumn, setFilterColumn] = useState('__all');
    const [filterValue, setFilterValue] = useState('');
    const [sortColumn, setSortColumn] = useState('');
    const [sortDirection, setSortDirection] = useState('asc');

    const checkBackendHealth = useCallback(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const response = await axios.get(HEALTH_ENDPOINT, {
                cache: 'no-store',
                signal: controller.signal,
                validateStatus: () => true
            });

            clearTimeout(timeoutId);

            if (response.status < 200 || response.status >= 300) {
                setBackendConnected(false);
                setBackendPort('---');
                return;
            }

            const payload = response.data || {};
            let port = payload?.port;
            if (payload?.backendUrl) {
                try {
                    const parsedUrl = new URL(payload.backendUrl);
                    port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80');
                } catch {
                    port = payload?.port;
                }
            }

            setBackendConnected(Boolean(payload?.status === 'ok'));
            setBackendPort(port ? String(port) : '---');
        } catch {
            setBackendConnected(false);
            setBackendPort('---');
        }
    }, []);

    useEffect(() => {
        checkBackendHealth();

        const intervalId = setInterval(() => {
            checkBackendHealth();
        }, 15000);

        return () => clearInterval(intervalId);
    }, [checkBackendHealth]);

    const filteredCollections = useMemo(() => {
        const normalized = searchTerm.trim().toLowerCase();
        if (!normalized) return DOC_COLLECTIONS;
        return DOC_COLLECTIONS.filter((name) => name.toLowerCase().includes(normalized));
    }, [searchTerm]);

    const selectedCollections = useMemo(
        () => DOC_COLLECTIONS.filter((collection) => checked[collection]),
        [checked]
    );

    const regularCollections = useMemo(
        () => filteredCollections.filter((collection) => !isExceptionCollection(collection)),
        [filteredCollections]
    );

    const categorizedCollections = useMemo(() => {
        const result = {
            content: [],
            user: [],
            workflow: [],
            logs: [],
            technical: []
        };

        regularCollections.forEach(collection => {
            const cat = getCollectionCategory(collection);
            if (result[cat]) {
                result[cat].push(collection);
            } else {
                result.technical.push(collection);
            }
        });

        return result;
    }, [regularCollections]);

    const exceptionCollections = useMemo(
        () => filteredCollections.filter((collection) => isExceptionCollection(collection)),
        [filteredCollections]
    );

    const queryResults = useQueries({
        queries: selectedCollections.map((collection) => ({
            queryKey: ['doc-dashboard', activeDocId, collection],
            enabled: Boolean(activeDocId),
            queryFn: () => fetchCollectionData({ docId: activeDocId, collection }),
            staleTime: 120 * 1000,
            retry: false,
            refetchOnWindowFocus: false
        }))
    });

    const collectionResultMap = useMemo(
        () =>
            selectedCollections.reduce((acc, collection, index) => {
                acc[collection] = queryResults[index];
                return acc;
            }, {}),
        [selectedCollections, queryResults]
    );

    const toggleCollection = useCallback((collection) => {
        setChecked((current) => ({
            ...current,
            [collection]: !current[collection]
        }));
    }, []);

    const setCollectionsChecked = useCallback((collections, value) => {
        setChecked((current) => {
            const next = { ...current };
            collections.forEach((collection) => {
                next[collection] = value;
            });
            return next;
        });
    }, []);

    const handleSelectAllFiltered = useCallback(() => {
        setCollectionsChecked(filteredCollections, true);
    }, [filteredCollections, setCollectionsChecked]);

    const handleClearAllFiltered = useCallback(() => {
        setCollectionsChecked(filteredCollections, false);
    }, [filteredCollections, setCollectionsChecked]);

    const regularSidebarItems = useMemo(
        () => regularCollections.map((collection) => (
            <SidebarCollectionItem
                key={collection}
                collection={collection}
                checked={Boolean(checked[collection])}
                onToggle={toggleCollection}
            />
        )),
        [regularCollections, checked, toggleCollection]
    );

    const exceptionSidebarItems = useMemo(
        () => exceptionCollections.map((collection) => (
            <SidebarCollectionItem
                key={collection}
                collection={collection}
                checked={Boolean(checked[collection])}
                onToggle={toggleCollection}
            />
        )),
        [exceptionCollections, checked, toggleCollection]
    );

    const combinedRows = useMemo(() => {
        if (!activeDocId) {
            return [];
        }

        const rows = [];
        selectedCollections.forEach((collection) => {
            const result = collectionResultMap[collection];
            const records = Array.isArray(result?.data) ? result.data : [];
            records.forEach((record) => {
                const expandedRows = expandRecordForTable(collection, record);
                expandedRows.forEach((expandedRow) => rows.push(expandedRow));
            });
        });

        return rows;
    }, [activeDocId, selectedCollections, collectionResultMap]);

    const detectedColumns = useMemo(() => {
        const columns = [];
        const seen = new Set();
        combinedRows.forEach((row) => {
            Object.keys(row).forEach((key) => {
                if (!seen.has(key) && !HIDDEN_UI_COLUMNS.has(key)) {
                    seen.add(key);
                    columns.push(key);
                }
            });
        });
        return columns;
    }, [combinedRows]);

    const rangeIgnoredColumns = useMemo(() => {
        if (!ignoreFromColumn || !ignoreToColumn) {
            return [];
        }

        const fromIndex = detectedColumns.indexOf(ignoreFromColumn);
        const toIndex = detectedColumns.indexOf(ignoreToColumn);

        if (fromIndex === -1 || toIndex === -1) {
            return [];
        }

        const start = Math.min(fromIndex, toIndex);
        const end = Math.max(fromIndex, toIndex);
        return detectedColumns.slice(start, end + 1);
    }, [detectedColumns, ignoreFromColumn, ignoreToColumn]);

    const ignoredColumns = useMemo(() => {
        const merged = new Set([
            ...DEFAULT_IGNORED_COLUMNS,
            ...parseIgnoredColumnsInput(ignoredColumnsInput),
            ...rangeIgnoredColumns
        ]);
        return Array.from(merged);
    }, [ignoredColumnsInput, rangeIgnoredColumns]);

    const ignoredColumnsSet = useMemo(() => new Set(ignoredColumns), [ignoredColumns]);

    const visibleColumns = useMemo(
        () => detectedColumns.filter((column) => !ignoredColumnsSet.has(column) && !COMMON_METADATA_KEY_SET.has(column) && !HIDDEN_UI_COLUMNS.has(column)),
        [detectedColumns, ignoredColumnsSet]
    );

    const filteredAndSortedRows = useMemo(() => {
        const normalizedFilter = filterValue.trim().toLowerCase();

        let rows = combinedRows;
        if (normalizedFilter) {
            rows = rows.filter((row) => {
                if (filterColumn !== '__all') {
                    return toDisplayText(filterColumn, row[filterColumn]).toLowerCase().includes(normalizedFilter);
                }

                return visibleColumns.some((column) =>
                    toDisplayText(column, row[column]).toLowerCase().includes(normalizedFilter)
                );
            });
        }

        if (!sortColumn) {
            return rows;
        }

        const sortedRows = [...rows];
        sortedRows.sort((a, b) => {
            const left = toSortableValue(sortColumn, a[sortColumn]);
            const right = toSortableValue(sortColumn, b[sortColumn]);

            if (left < right) {
                return sortDirection === 'asc' ? -1 : 1;
            }

            if (left > right) {
                return sortDirection === 'asc' ? 1 : -1;
            }

            return 0;
        });

        return sortedRows;
    }, [combinedRows, filterColumn, filterValue, sortColumn, sortDirection, visibleColumns]);

    const primaryCommonRecord = useMemo(() => {
        const commonResult = collectionResultMap.rcommon;
        const commonRecords = Array.isArray(commonResult?.data) ? commonResult.data : [];

        if (commonRecords.length > 0) {
            return commonRecords[0];
        }

        if (combinedRows.length > 0) {
            return combinedRows[0];
        }

        return null;
    }, [collectionResultMap, combinedRows]);

    const commonMetadataEntries = useMemo(() => {
        if (!activeDocId) {
            return [];
        }

        const source = primaryCommonRecord || {};
        return COMMON_METADATA_KEYS.map((key) => {
            if (key === 'docid') {
                return [key, source[key] ?? activeDocId ?? ''];
            }
            return [key, source[key] ?? ''];
        }).filter(([, value]) => value !== '');
    }, [activeDocId, primaryCommonRecord]);

    const toggleIgnoredColumn = useCallback((column) => {
        setIgnoredColumnsInput((current) => {
            const next = new Set(parseIgnoredColumnsInput(current));

            if (next.has(column)) {
                next.delete(column);
            } else {
                next.add(column);
            }

            return Array.from(next).join(',');
        });
    }, []);

    const toggleSortOnColumn = useCallback((column) => {
        if (sortColumn !== column) {
            setSortColumn(column);
            setSortDirection('asc');
            return;
        }

        setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    }, [sortColumn]);

    const handleSyncTarget = async (event) => {
        event.preventDefault();
        setInputError('');
        setSyncing(true);

        const parsed = parseUserInput(docInput, inputKey);
        if (!parsed.value) {
            setInputError('Enter a value for docid, manuscriptno, or identifier.');
            setSyncing(false);
            return;
        }

        try {
            const syncedDocId = await runDocSync(parsed.key, parsed.value);
            const resolvedDocId = syncedDocId || await resolveDocId(parsed.key, parsed.value);

            if (!resolvedDocId) {
                setInputError(`Unable to resolve docid from ${parsed.key}.`);
                setActiveDocId('');
                setSyncing(false);
                return;
            }

            setActiveDocId(resolvedDocId);
        } catch (error) {
            setInputError(error.message || 'Failed to sync snapshot.');
            setActiveDocId('');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
            <Header />

            <main className="flex-1 p-6">
                <div className="max-w-full mx-auto space-y-6">
                    <section className="card p-5">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Intelligence Dashboard</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Zero-DB-Growth view for exported Mongo snapshots by docid.
                                </p>
                            </div>

                            <form onSubmit={handleSyncTarget} className="w-full lg:w-auto flex gap-2">
                                <select
                                    value={inputKey}
                                    onChange={(event) => setInputKey(event.target.value)}
                                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="docid">DOC ID</option>
                                    <option value="manuscriptno">MANUSCRIPT NO</option>
                                    <option value="identifier">IDENTIFIER</option>
                                </select>
                                <input
                                    type="text"
                                    value={docInput}
                                    onChange={(event) => setDocInput(event.target.value)}
                                    placeholder={'docid: "N181a1ffd-..." or manuscriptno: "PCOMPBIOL..." or identifier: "10.1093/..."'}
                                    className="w-full lg:w-[30rem] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                />
                                <button type="submit" disabled={syncing} className="btn-primary whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed">
                                    {syncing ? 'Syncing...' : 'Load Snapshot'}
                                </button>
                                <div
                                    className={`px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap ${backendConnected
                                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
                                        : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
                                        }`}
                                    title={`Health: ${HEALTH_ENDPOINT}`}
                                >
                                    {backendPort} {backendConnected ? 'Connected' : 'Disconnected'}
                                </div>
                            </form>
                        </div>

                        {inputError && (
                            <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                                {inputError}
                            </div>
                        )}

                        {activeDocId && (
                            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                                Active docid: <span className="font-semibold">{activeDocId}</span>
                            </div>
                        )}
                    </section>

                    <section className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                        <aside className="card p-4 xl:col-span-1">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-semibold text-gray-900 dark:text-white">Collections</h2>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {selectedCollections.length}/{DOC_COLLECTIONS.length}
                                </span>
                            </div>

                            <div className="relative mb-3">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search collections"
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                />
                            </div>

                            <div className="flex gap-2 mb-3">
                                <button
                                    type="button"
                                    onClick={handleSelectAllFiltered}
                                    className="px-2.5 py-1.5 rounded-md text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearAllFiltered}
                                    className="px-2.5 py-1.5 rounded-md text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    Clear All
                                </button>
                            </div>

                            <div className="max-h-[62vh] overflow-auto space-y-4 pr-1">
                                {Object.entries(COLLECTION_CATEGORIES).map(([key, category]) => {
                                    const items = categorizedCollections[key];
                                    if (!items || items.length === 0) return null;

                                    return (
                                        <div key={key} className="space-y-1">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400 mb-1 flex items-center justify-between">
                                                <span>{category.label}</span>
                                                <span className="text-[10px] bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded text-primary-700 dark:text-primary-300">
                                                    {items.length}
                                                </span>
                                            </div>
                                            {items.map((collection) => (
                                                <SidebarCollectionItem
                                                    key={collection}
                                                    collection={collection}
                                                    checked={Boolean(checked[collection])}
                                                    onToggle={toggleCollection}
                                                />
                                            ))}
                                        </div>
                                    );
                                })}

                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3" />

                                <div className="space-y-1">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 mb-1 flex items-center justify-between">
                                        <span>Exception</span>
                                        <span className="text-[10px] bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded text-red-700 dark:text-red-300">
                                            {exceptionCollections.length}
                                        </span>
                                    </div>
                                    {exceptionCollections.length ? exceptionCollections.map(collection => (
                                        <SidebarCollectionItem
                                            key={collection}
                                            collection={collection}
                                            checked={Boolean(checked[collection])}
                                            onToggle={toggleCollection}
                                        />
                                    )) : (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">No exception collections</div>
                                    )}
                                </div>
                            </div>
                        </aside>

                        <div className="xl:col-span-3">
                            <div className="flex items-center justify-end gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('cards')}
                                    className={`px-3 py-1.5 rounded-lg text-sm border ${viewMode === 'cards'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                                        }`}
                                >
                                    Cards View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`px-3 py-1.5 rounded-lg text-sm border ${viewMode === 'table'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                                        }`}
                                >
                                    Table View
                                </button>
                            </div>

                            {viewMode === 'cards' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                                    {selectedCollections.map((collection) => {
                                        const result = collectionResultMap[collection];
                                        const records = result?.data || [];
                                        const hasData = Array.isArray(records) && records.length > 0;

                                        return (
                                            <article key={collection} className="card p-4 min-h-[180px] flex flex-col">
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">{collection}</h3>
                                                    <Database className="w-4 h-4 text-gray-400" />
                                                </div>

                                                {!activeDocId && (
                                                    <div className="flex-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                        {syncing ? 'Running sync-doc export…' : 'Enter a docid to load this widget.'}
                                                    </div>
                                                )}

                                                {activeDocId && result?.isLoading && (
                                                    <div className="flex-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                        Loading snapshot…
                                                    </div>
                                                )}

                                                {activeDocId && result?.isError && (
                                                    <div className="flex-1 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        {result.error?.message || 'Load failed'}
                                                    </div>
                                                )}

                                                {activeDocId && result?.isSuccess && !hasData && (
                                                    <div className="flex-1 flex flex-col justify-center items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                        <div className="flex items-center gap-2">
                                                            <FileX2 className="w-4 h-4" />
                                                            No Data Recorded
                                                        </div>
                                                    </div>
                                                )}

                                                {activeDocId && result?.isSuccess && hasData && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            {records.length} record{records.length > 1 ? 's' : ''}
                                                        </div>
                                                        <pre className="text-xs rounded-lg bg-gray-100 dark:bg-gray-900 p-2 overflow-auto max-h-24 text-gray-700 dark:text-gray-300">
                                                            {JSON.stringify(records[0], null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                <section className="card p-4 space-y-4">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                                Ignore columns (comma-separated)
                                            </label>
                                            <input
                                                type="text"
                                                value={ignoredColumnsInput}
                                                onChange={(event) => setIgnoredColumnsInput(event.target.value)}
                                                placeholder="_r,_w"
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                                    Ignore from
                                                </label>
                                                <select
                                                    value={ignoreFromColumn}
                                                    onChange={(event) => setIgnoreFromColumn(event.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                                >
                                                    <option value="">--</option>
                                                    {detectedColumns.map((column) => (
                                                        <option key={`from-${column}`} value={column}>{column}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                                    Ignore to
                                                </label>
                                                <select
                                                    value={ignoreToColumn}
                                                    onChange={(event) => setIgnoreToColumn(event.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                                >
                                                    <option value="">--</option>
                                                    {detectedColumns.map((column) => (
                                                        <option key={`to-${column}`} value={column}>{column}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                                            Loaded columns (click to toggle ignore)
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {detectedColumns.length === 0 && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">No columns detected yet.</span>
                                            )}
                                            {detectedColumns.map((column) => {
                                                const isIgnored = ignoredColumnsSet.has(column);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={column}
                                                        onClick={() => toggleIgnoredColumn(column)}
                                                        className={`px-2 py-1 rounded-md text-xs border ${isIgnored
                                                            ? 'bg-gray-200 text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                                                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                                                            }`}
                                                    >
                                                        {column}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-600 dark:text-gray-300">
                                        Ignored columns: {ignoredColumns.length ? ignoredColumns.join(', ') : 'None'}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                                Filter column
                                            </label>
                                            <select
                                                value={filterColumn}
                                                onChange={(event) => setFilterColumn(event.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                            >
                                                <option value="__all">All visible columns</option>
                                                {visibleColumns.map((column) => (
                                                    <option key={`filter-${column}`} value={column}>{column}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                                Filter value
                                            </label>
                                            <input
                                                type="text"
                                                value={filterValue}
                                                onChange={(event) => setFilterValue(event.target.value)}
                                                placeholder="Type to filter rows"
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                                Sort column
                                            </label>
                                            <select
                                                value={sortColumn}
                                                onChange={(event) => setSortColumn(event.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                            >
                                                <option value="">-- none --</option>
                                                {visibleColumns.map((column) => (
                                                    <option key={`sort-${column}`} value={column}>{column}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                                Sort order
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                {sortDirection === 'asc' ? 'Ascending ↑' : 'Descending ↓'}
                                            </button>
                                        </div>
                                    </div>

                                    {activeDocId && commonMetadataEntries.length > 0 && (
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-3">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-2">
                                                Common Metadata
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                                                {commonMetadataEntries.map(([key, value]) => (
                                                    <div key={key} className="px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                                                        <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400">{key}</div>
                                                        <div className="text-xs text-gray-800 dark:text-gray-200 break-words">{String(value)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {!activeDocId && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Enter a docid to load combined table data.
                                        </div>
                                    )}

                                    {activeDocId && combinedRows.length === 0 && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            No combined rows to display for selected collections.
                                        </div>
                                    )}

                                    {activeDocId && combinedRows.length > 0 && visibleColumns.length > 0 && (
                                        <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                                <thead className="bg-gray-50 dark:bg-gray-800">
                                                    <tr>
                                                        {visibleColumns.map((column) => (
                                                            <th
                                                                key={column}
                                                                scope="col"
                                                                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
                                                            >
                                                                {column}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                                    {filteredAndSortedRows.map((row, rowIndex) => (
                                                        <tr key={`${row.__collection || 'row'}-${rowIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                            {visibleColumns.map((column) => (
                                                                <td key={`${column}-${rowIndex}`} className="px-3 py-2 align-top text-gray-700 dark:text-gray-200">
                                                                    {toDisplayText(column, row[column])}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {activeDocId && combinedRows.length > 0 && visibleColumns.length > 0 && filteredAndSortedRows.length === 0 && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            No rows match the current filter.
                                        </div>
                                    )}

                                    {activeDocId && combinedRows.length > 0 && visibleColumns.length === 0 && (
                                        <div className="text-sm text-amber-700 dark:text-amber-300">
                                            All columns are currently ignored. Remove one or more ignored columns to render the table.
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
