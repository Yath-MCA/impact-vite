import React, { useState, useEffect, useRef } from 'react';
// Font Awesome Icons
import { FaBuilding, FaIndent, FaRocket } from 'react-icons/fa';
import {

  FiBook,
  FiEdit,
  FiTrash2,
  FiEye,
  FiPlus,
  FiSearch,
  FiFilter,
  FiDownload,
  FiChevronDown
} from 'react-icons/fi';
import { fetchConfigXml } from './fetchConfigXml';

const ConfigList = ({ type }) => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [journals, setJournals] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
    'apa': 'APA (American Psychological Association)',
    'intellect': 'Intellect Books',
    'nihr': 'NIHR Journals Library',
    'oso': 'OSO (Oxford Scholarship Online)',
    'tnf': 'Taylor & Francis',
    'oho': 'Oxford Handbooks Online'
  };

  useEffect(() => {
    cancelledRef.current = false;
    if (type === 'clients') {
      loadClientList();
    } else if (type === 'journals') {
      loadClients();
    }
    return () => {
      cancelledRef.current = true;
    };
  }, [type]);

  useEffect(() => {
    cancelledRef.current = false;
    if (type === 'journals' && selectedClient) {
      loadJournalsByClient(selectedClient);
    }
    return () => {
      cancelledRef.current = true;
    };
  }, [selectedClient, type]);

  const loadClientList = async () => {
    setLoading(true);
    try {
      const clientsData = [];

      // Process journal clients
      for (const [clientId, path] of Object.entries(CONFIG_PATHS.journals)) {
        if (cancelledRef.current) return;
        try {
          const response = await fetchConfigXml(path);
          if (response.ok) {
            const xmlText = response.text;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

            const impactNode = xmlDoc.querySelector('impact');
            const customerName = impactNode ? impactNode.getAttribute('customer') : clientId;
            const journals = xmlDoc.querySelectorAll('listofjournals > journal');

            clientsData.push({
              id: clientId,
              name: getClientDisplayName(clientId, customerName),
              journalCount: journals.length,
              type: 'journals',
              path
            });
          }
        } catch (error) {
          console.error(`Error processing ${clientId}:`, error);
        }
      }

      // Process book clients
      for (const [clientId, path] of Object.entries(CONFIG_PATHS.books)) {
        if (cancelledRef.current) return;
        try {
          const response = await fetchConfigXml(path);
          if (response.ok) {
            const xmlText = response.text;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

            const impactNode = xmlDoc.querySelector('impact');
            const customerName = impactNode ? impactNode.getAttribute('customer') : clientId;
            const books = xmlDoc.querySelectorAll('listofbooks > book, listofjournals > journal');

            clientsData.push({
              id: clientId,
              name: getClientDisplayName(clientId, customerName) + ' (Books)',
              journalCount: books.length,
              type: 'books',
              path
            });
          }
        } catch (error) {
          console.error(`Error processing ${clientId} books:`, error);
        }
      }

      if (cancelledRef.current) return;
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading client list:', error);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  };

  const loadClients = () => {
    const allClients = [
      ...Object.keys(CONFIG_PATHS.journals),
      ...Object.keys(CONFIG_PATHS.books)
    ];
    setClients(allClients.map(clientId => ({
      id: clientId,
      name: clientNames[clientId] || clientId.toUpperCase()
    })));
  };

  const loadJournalsByClient = async (clientId) => {
    if (!clientId) return;

    setLoading(true);
    try {
      let configPath = CONFIG_PATHS.journals[clientId] || CONFIG_PATHS.books[clientId];

      if (!configPath) {
        console.error(`No configuration path found for client: ${clientId}`);
        setJournals([]);
        return;
      }

      const response = await fetchConfigXml(configPath);
      if (cancelledRef.current) return;
      if (!response.ok) {
        throw new Error(`Failed to fetch configuration for ${clientId}`);
      }

      const xmlText = response.text;
      if (cancelledRef.current) return;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        console.error('XML parsing error:', parseError.textContent);
        if (!cancelledRef.current) setJournals([]);
        return;
      }

      const journalsData = [];
      const journalNodes = xmlDoc.querySelectorAll('listofjournals > journal, listofbooks > book');

      journalNodes.forEach(journalNode => {
        const short = journalNode.getAttribute('short') || journalNode.getAttribute('code') || 'N/A';
        const title = journalNode.getAttribute('journal-title') ||
          journalNode.getAttribute('book-title') ||
          journalNode.getAttribute('title') || 'Untitled';
        const batch = journalNode.getAttribute('batch') || 'N/A';
        const by = journalNode.getAttribute('by') || 'N/A';
        const abbr = journalNode.getAttribute('abbr') || '';

        journalsData.push({
          short,
          title,
          batch,
          by,
          abbr,
          clientId
        });
      });

      if (cancelledRef.current) return;
      setJournals(journalsData);
    } catch (error) {
      console.error(`Error fetching journals for ${clientId}:`, error);
      if (!cancelledRef.current) setJournals([]);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  };

  const getClientDisplayName = (clientId, customerName) => {
    return clientNames[clientId] || customerName || clientId.toUpperCase();
  };

  const handleEditClient = (clientId) => {
    console.log('Edit client:', clientId);
    // Implement edit functionality
  };

  const handleDeleteClient = (clientId) => {
    if (window.confirm(`Are you sure you want to delete client ${clientId}?`)) {
      console.log('Delete client:', clientId);
      // Implement delete functionality
      setClients(clients.filter(client => client.id !== clientId));
    }
  };

  const handleEditJournal = (clientId, journalShort) => {
    console.log('Edit journal:', journalShort, 'Client:', clientId);
    // Implement edit functionality - switch to editor view
  };

  const handleViewJournal = (clientId, journalShort) => {
    console.log('View journal:', journalShort, 'Client:', clientId);
    // Implement view functionality - switch to editor view with read-only
  };

  const handleDeleteJournal = (clientId, journalShort) => {
    if (window.confirm(`Are you sure you want to delete journal ${journalShort}?`)) {
      console.log('Delete journal:', journalShort, 'Client:', clientId);
      // Implement delete functionality
      setJournals(journals.filter(journal => !(journal.clientId === clientId && journal.short === journalShort)));
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredJournals = journals.filter(journal =>
    journal.short.toLowerCase().includes(searchQuery.toLowerCase()) ||
    journal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    journal.clientId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderClientsList = () => (
    <div className="clients-list">
      <div className="list-header">
        <h2>Client Configurations</h2>
        <div className="list-actions">
          <button className="btn btn-primary">
            <FiPlus className="me-2" />
            Add New Client
          </button>
          <button className="btn btn-outline-secondary">
            <FiDownload className="me-2" />
            Export All
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading client configurations...</p>
        </div>
      ) : (
        <div className="config-tree">
          {filteredClients.length > 0 ? (
            filteredClients.map(client => (
              <div key={client.id} className="tree-item">
                <div className="tree-item-content">
                  <FaBuilding className="tree-icon text-warning" />
                  <div className="tree-item-info">
                    <strong>{client.name}</strong>
                    <span className="badge badge-primary ms-2">
                      {client.journalCount || 0} journals
                    </span>
                  </div>
                  <div className="tree-item-actions">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleEditClient(client.id)}
                      title="Edit Client"
                    >
                      <FiEdit />
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteClient(client.id)}
                      title="Delete Client"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted">No clients found</p>
          )}
        </div>
      )}
    </div>
  );

  const renderJournalsList = () => (
    <div className="journals-list">
      <div className="list-header">
        <h2>Journal Configurations</h2>
        <div className="list-controls">
          <div className="client-selector">
            <label>Select Client:</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="form-select"
            >
              <option value="">Select Client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search journals..."
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
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="row">
            <div className="col-md-4">
              <label>Batch:</label>
              <select className="form-select">
                <option value="">All Batches</option>
                <option value="101">Batch 101</option>
                <option value="102">Batch 102</option>
              </select>
            </div>
            <div className="col-md-4">
              <label>Status:</label>
              <select className="form-select">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading journal configurations...</p>
        </div>
      ) : selectedClient ? (
        <div className="journals-container">
          {filteredJournals.length > 0 ? (
            filteredJournals.map(journal => (
              <div key={`${journal.clientId}-${journal.short}`} className="journal-item">
                <div className="journal-item-content">
                  <div className="journal-info">
                    <FiBook className="journal-icon text-info" />
                    <div>
                      <strong>{journal.short}</strong> - {journal.title}
                      <br />
                      <small className="text-muted">
                        Batch: {journal.batch} | By: {journal.by}
                      </small>
                    </div>
                  </div>
                  <div className="journal-actions">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleEditJournal(journal.clientId, journal.short)}
                      title="Edit Journal"
                    >
                      <FiEdit />
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => handleViewJournal(journal.clientId, journal.short)}
                      title="View Journal"
                    >
                      <FiEye />
                      View
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteJournal(journal.clientId, journal.short)}
                      title="Delete Journal"
                    >
                      <FiTrash2 />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted">No journals found for this client</p>
          )}
        </div>
      ) : (
        <div className="no-selection">
          <FiBook className="no-selection-icon" />
          <p>Select a client to view journals</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="config-list">
      {type === 'clients' ? renderClientsList() : renderJournalsList()}
    </div>
  );
};

export default ConfigList;
