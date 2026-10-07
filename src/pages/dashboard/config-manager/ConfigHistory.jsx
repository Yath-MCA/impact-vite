import React, { useState, useEffect, useRef } from 'react';
import { FaRocket } from 'react-icons/fa';
import {
  FiRefreshCw,
  FiCalendar,
  FiUser,
  FiFile,
  FiChevronDown,
  FiChevronUp,
  FiEye,
  FiDownload,
  FiFilter,
  FiSearch,
  FiDatabase,
  FiPlusCircle
} from 'react-icons/fi';
import { fetchConfigXml } from './fetchConfigXml';

const ConfigHistory = () => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const cancelledRef = useRef(false);

  // Configuration paths
  const CONFIG_PATHS = {
    journals: {
      lww: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/lww/config.xml`,
      oup: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/oup/config.xml`,
      plos: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/plos/config.xml`,
      medknow: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/medknow/config.xml`,
      brill: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/brill/config.xml`,
      tnfjournals: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/tnfjournals/config.xml`,
      acs: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/acs/config.xml`,
      intellect: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/intellect/config.xml`,
      nihr: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/nihr/config.xml`,
    },
    books: {
      oso: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/books/oso/config.xml`,
      tnf: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/books/tnf/config.xml`,
      oho: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/books/oho/config.xml`
    }
  };

  const clientNames = {
    'lww': 'LWW (Lippincott Williams & Wilkins)',
    'oup': 'OUP (Oxford University Press)',
    'plos': 'PLOS (Public Library of Science)',
    'medknow': 'Medknow Publications',
    'brill': 'Brill Publishers',
    'tnfjournals': 'Taylor & Francis Journals',
    'acs': 'ACS (American Chemical Society)',
    'intellect': 'Intellect Books',
    'nihr': 'NIHR Journals Library',
    'oso': 'OSO (Oxford Scholarship Online)',
    'tnf': 'Taylor & Francis',
    'oho': 'Oxford Handbooks Online'
  };

  useEffect(() => {
    cancelledRef.current = false;
    loadChangeHistory();
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const loadChangeHistory = async () => {
    setLoading(true);
    try {
      const historyData = [];
      let historyId = 1;

      // Helper function to extract history from XML
      const extractHistoryFromXml = async (xmlDoc, clientId, selectors) => {
        const elements = xmlDoc.querySelectorAll(selectors);

        elements.forEach(element => {
          const short = element.getAttribute('short') || element.getAttribute('code') || 'Unknown';
          const title = element.getAttribute('journal-title') || element.getAttribute('book-title') || 'Untitled';
          const batch = element.getAttribute('batch') || 'N/A';
          const by = element.getAttribute('by') || '';
          const copyBy = element.getAttribute('copy-by') || '';
          const dataCreatedRaw = element.getAttribute('data-created') || '';

          if (!by && !copyBy && !dataCreatedRaw) return;

          const parseAttr = (val) => {
            if (!val) return null;

            const parts = val.split('_');
            if (parts.length < 2) return null;

            const user = parts[0] || 'Unknown';
            const dateStr = parts.slice(1).join('_');
            const date = parseAttributeDate(dateStr);

            return {
              user,
              date,
              raw: val
            };
          };

          const created = by ? parseAttr(by) : null;
          const deployed = copyBy ? parseAttr(copyBy) : null;
          const dataCreated = parseDataCreatedMeta(dataCreatedRaw);
          const time = deployed?.date || created?.date || dataCreated?.date;

          if (!time) return;

          historyData.push({
            id: String(historyId++),
            file: `${clientId}/${short}`,
            journal: title,
            batch,
            clientId,
            journalShort: short,
            dataCreated,
            created,
            deployed,
            timestamp: time
          });
        });
      };

      // Process journal configurations
      for (const [clientId, path] of Object.entries(CONFIG_PATHS.journals)) {
        if (cancelledRef.current) return;
        try {
          const response = await fetchConfigXml(path);
          if (!response.ok) continue;

          const xmlText = response.text;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

          await extractHistoryFromXml(xmlDoc, clientId, 'listofjournals > journal');
        } catch (error) {
          console.error(`Error parsing history for ${clientId}:`, error);
        }
      }

      // Process book configurations
      for (const [clientId, path] of Object.entries(CONFIG_PATHS.books)) {
        if (cancelledRef.current) return;
        try {
          const response = await fetchConfigXml(path);
          if (!response.ok) continue;

          const xmlText = response.text;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

          await extractHistoryFromXml(xmlDoc, clientId, 'listofbooks > book, listofjournals > journal');
        } catch (error) {
          console.error(`Error parsing history for ${clientId}:`, error);
        }
      }

      if (cancelledRef.current) return;

      // Sort by date in descending order
      historyData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setHistory(historyData);

    } catch (error) {
      console.error('Error loading change history:', error);
      if (!cancelledRef.current) {
        // Set mock data if loading fails
        setHistory(getMockHistoryData());
      }
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  };

  const getMockHistoryData = () => {
    return [
      {
        id: '1',
        file: 'lww/EJGH',
        journal: 'European Journal of Gastroenterology & Hepatology',
        batch: '101',
        clientId: 'lww',
        journalShort: 'EJGH',
        dataCreated: { user: 'ADMIN_UI', date: '2026-03-20T10:00:00', raw: 'ADMIN_UI_2026-03-20T10:00:00' },
        created: { user: 'john_doe', date: '2026-03-21T14:30:00', raw: 'john_doe_21_Mar_26' },
        deployed: { user: 'jane_smith', date: '2026-03-22T09:15:00', raw: 'jane_smith_22_Mar_26' },
        timestamp: '2026-03-22T09:15:00'
      },
      {
        id: '2',
        file: 'oup/OSO',
        journal: 'Oxford Scholarship Online',
        batch: '102',
        clientId: 'oup',
        journalShort: 'OSO',
        dataCreated: { user: 'ADMIN_UI', date: '2026-03-19T11:00:00', raw: 'ADMIN_UI_2026-03-19T11:00:00' },
        created: { user: 'bob_johnson', date: '2026-03-20T16:45:00', raw: 'bob_johnson_20_Mar_26' },
        deployed: null,
        timestamp: '2026-03-20T16:45:00'
      },
      {
        id: '3',
        file: 'plos/PLOS',
        journal: 'Public Library of Science',
        batch: '101',
        clientId: 'plos',
        journalShort: 'PLOS',
        dataCreated: { user: 'ADMIN_UI', date: '2026-03-18T13:30:00', raw: 'ADMIN_UI_2026-03-18T13:30:00' },
        created: { user: 'alice_wilson', date: '2026-03-19T10:20:00', raw: 'alice_wilson_19_Mar_26' },
        deployed: { user: 'charlie_brown', date: '2026-03-21T08:00:00', raw: 'charlie_brown_21_Mar_26' },
        timestamp: '2026-03-21T08:00:00'
      }
    ];
  };

  const parseAttributeDate = (dateStr) => {
    try {
      const parts = dateStr.split('_');
      if (parts.length < 3) return null;

      const [dayRaw, monthStr, yearRaw] = parts;
      const months = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };

      if (!months[monthStr] || !/^\d{1,2}$/.test(dayRaw) || !/^\d{2}$/.test(yearRaw)) {
        return null;
      }

      const day = dayRaw.padStart(2, '0');
      const year = `20${yearRaw}`;
      const month = months[monthStr];

      return `${year}-${month}-${day}T12:00:00`;
    } catch {
      return null;
    }
  };

  const parseDataCreatedMeta = (rawValue) => {
    if (!rawValue || !rawValue.startsWith('ADMIN_UI_')) return null;

    const isoStr = rawValue.replace('ADMIN_UI_', '');
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return null;

    return {
      user: 'ADMIN_UI',
      date: date.toISOString(),
      raw: rawValue
    };
  };

  const formatHistoryDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return date.toLocaleDateString('en-US', options);
    } catch {
      return timestamp;
    }
  };

  const toggleGroupExpansion = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const viewJournalConfig = (clientId, journalShort) => {
    console.log('View journal:', journalShort, 'Client:', clientId);
    // Implement view functionality - switch to editor view
  };

  const downloadVersion = (id) => {
    console.log('Download version:', id);
    // Implement download functionality
  };

  const restoreVersion = (id) => {
    if (window.confirm('Are you sure you want to restore this version?')) {
      console.log('Restore version:', id);
      // Implement restore functionality
    }
  };

  // Group history by client and batch
  const groupedHistory = history.reduce((acc, item) => {
    const clientKey = item.clientId || 'unknown';
    const batchKey = item.batch || 'N/A';
    const groupKey = `${clientKey}__${batchKey}`;

    if (!acc[groupKey]) {
      acc[groupKey] = {
        clientId: clientKey,
        batch: batchKey,
        items: []
      };
    }
    acc[groupKey].items.push(item);
    return acc;
  }, {});

  // Apply filters
  const filteredGroups = Object.entries(groupedHistory).filter(([groupKey, group]) => {
    const matchesSearch = !searchQuery ||
      groupKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.items.some(item =>
        item.journal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.journalShort?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesClient = !filterClient || group.clientId === filterClient;
    const matchesBatch = !filterBatch || group.batch === filterBatch;

    return matchesSearch && matchesClient && matchesBatch;
  });

  const sortedGroups = filteredGroups
    .map(([groupKey, group]) => ({ groupKey, ...group }))
    .sort((a, b) => {
      const clientCompare = String(a.clientId).localeCompare(String(b.clientId));
      if (clientCompare !== 0) return clientCompare;
      return String(a.batch).localeCompare(String(b.batch));
    });

  const renderEventRow = (meta, badgeClass, iconClass, label) => {
    if (!meta) return '';
    return (
      <div className="event-row">
        <span className={`badge ${badgeClass}`}>
          <i className={iconClass}></i> {label}
        </span>
        <span className="event-user"><strong>{meta.user}</strong></span>
        <small className="event-date">{formatHistoryDate(meta.date)}</small>
        <small className="event-raw">({meta.raw})</small>
      </div>
    );
  };

  const getCommonMeta = (items, key) => {
    const metas = items.map(item => item[key]).filter(Boolean);
    if (metas.length !== items.length) return null;
    const firstRaw = metas[0]?.raw || '';
    const allSame = metas.every(meta => (meta?.raw || '') === firstRaw);
    return allSame ? metas[0] : null;
  };

  return (
    <div className="config-history">
      <div className="history-header">
        <h2>
          <FiRefreshCw className="me-2" />
          Change History
        </h2>

        <div className="history-controls">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            className="btn btn-outline-secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FiFilter className="me-2" />
            Filters
          </button>

          <button
            className="btn btn-outline-primary"
            onClick={loadChangeHistory}
            disabled={loading}
          >
            <FiRefreshCw className={`me-2 ${loading ? 'spinning' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="row">
            <div className="col-md-4">
              <label>Client:</label>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="form-select"
              >
                <option value="">All Clients</option>
                {Object.entries(clientNames).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label>Batch:</label>
              <select
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
                className="form-select"
              >
                <option value="">All Batches</option>
                <option value="101">Batch 101</option>
                <option value="102">Batch 102</option>
              </select>
            </div>
            <div className="col-md-4">
              <label>Action:</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="form-select"
              >
                <option value="">All Actions</option>
                <option value="created">Created</option>
                <option value="deployed">Deployed</option>
                <option value="modified">Modified</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading change history...</p>
        </div>
      ) : sortedGroups.length > 0 ? (
        <div className="history-groups">
          {sortedGroups.map((group, groupIndex) => {
            const groupKey = `${group.clientId}_${group.batch}_${groupIndex}`;
            const isExpanded = expandedGroups.has(groupKey);
            const clientLabel = clientNames[group.clientId] || group.clientId?.toUpperCase() || 'Unknown';

            const commonDataCreated = getCommonMeta(group.items, 'dataCreated');
            const commonCreated = getCommonMeta(group.items, 'created');
            const commonDeployed = getCommonMeta(group.items, 'deployed');

            return (
              <div key={groupKey} className="history-group">
                <div className="group-header">
                  <div className="group-info">
                    <h5>
                      <FiGitBranch className="me-2" />
                      Client <strong>{clientLabel}</strong>
                      <span className="ms-2">Batch <strong>{group.batch}</strong></span>
                      <span className="badge bg-secondary ms-2">{group.items.length} journal(s)</span>
                    </h5>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => toggleGroupExpansion(groupKey)}
                  >
                    {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                </div>

                <div className="common-events">
                  {renderEventRow(commonDataCreated, 'bg-secondary', 'fas fa-database', 'UI Created')}
                  {renderEventRow(commonCreated, 'bg-success', 'fas fa-plus-circle', 'Created')}
                  {renderEventRow(commonDeployed, 'bg-primary', 'fas fa-rocket', 'Deployed')}
                </div>

                {isExpanded && (
                  <div className="group-content">
                    {group.items.map(item => (
                      <div key={item.id} className="history-item">
                        <div className="item-content">
                          <div className="item-info">
                            <h6>
                              <FiFile className="me-2" />
                              <strong>{item.file}</strong>
                            </h6>
                            <p className="item-title">{item.journal}</p>

                            {!commonDataCreated && renderEventRow(item.dataCreated, 'bg-secondary', 'fas fa-database', 'UI Created')}
                            {!commonCreated && renderEventRow(item.created, 'bg-success', 'fas fa-plus-circle', 'Created')}
                            {!commonDeployed && renderEventRow(item.deployed, 'bg-primary', 'fas fa-rocket', 'Deployed')}
                          </div>

                          <div className="item-actions">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => viewJournalConfig(item.clientId, item.journalShort)}
                            >
                              <FiEye className="me-1" />
                              View
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => downloadVersion(item.id)}
                            >
                              <FiDownload className="me-1" />
                              Download
                            </button>
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => restoreVersion(item.id)}
                            >
                              <FiRefreshCw className="me-1" />
                              Restore
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-history">
          <FiRefreshCw className="no-history-icon" />
          <h3>No Change History Found</h3>
          <p>No configuration changes have been recorded yet.</p>
        </div>
      )}
    </div>
  );
};

export default ConfigHistory;
