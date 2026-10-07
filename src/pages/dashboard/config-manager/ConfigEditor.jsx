import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaIndent, FaOutdent, FaRocket } from 'react-icons/fa'
import {
  FiSave,
  FiCheck,
  FiRotateCcw,
  FiDownload,
  FiUpload,
  FiFile,
  FiAlertTriangle,
  FiCheckCircle,
  FiX,
  FiEye,
  FiEdit3,
  FiCopy,
  FiSearch
} from 'react-icons/fi';

const ConfigEditor = () => {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [currentFile, setCurrentFile] = useState('');
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState({ valid: true, error: null });
  const [isModified, setIsModified] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'preview'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showWordWrap, setShowWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState(14);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sample configuration files for demo
  const sampleFiles = [
    {
      value: 'lww/config.xml',
      label: 'LWW - Main Config',
      path: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/lww/config.xml`
    },
    {
      value: 'oup/config.xml',
      label: 'OUP - Main Config',
      path: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/oup/config.xml`
    },
    {
      value: 'oso/config.xml',
      label: 'OSO - Main Config',
      path: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/books/oso/config.xml`
    }
  ];

  useEffect(() => {
    // Load default sample content
    loadSampleContent();
  }, []);

  useEffect(() => {
    // Check for modifications
    setIsModified(content !== originalContent);
    validateXML(content);
  }, [content, originalContent]);

  const loadSampleContent = () => {
    const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<impact customer="lww">
    <project type="journals">
        <pages name="pages" />
        <dialogs name="ModuleDialogs">
            <functionality name="GuideTour" show="true" showForAU="true" showForCO="true" />
            <functionality name="AlertDialogModule" show="true" showForAU="true" showForCO="true" />
        </dialogs>
        <listofjournals>
            <journal short="SAMPLE" abbr="" journal-title="Sample Journal" mantis="12345" batch="101" by="admin" copy-by="" qc-by="">
                <author data-name="contrib" surname="yes" given-names="yes" />
                <affiliation data-name="aff" designators="Alphabets" />
                <abstract data-name="abstract" GA="true" />
                <keywords data-name="keywords" seperator=", " minimum="3" maximum="10" />
            </journal>
        </listofjournals>
    </project>
</impact>`;

    setContent(sampleXML);
    setOriginalContent(sampleXML);
    setCurrentFile('sample.xml');
  };

  const loadFile = async (filePath) => {
    if (!filePath) return;

    setLoading(true);
    try {
      const response = await axios.get(filePath, {
        responseType: 'text',
        validateStatus: () => true
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error('File not found');
      }

      const xmlContent = response.data || '';
      setContent(xmlContent);
      setOriginalContent(xmlContent);
      setCurrentFile(filePath);
      setCurrentFile(filePath.split('/').pop()); // Just filename
    } catch (error) {
      console.error('Error loading file:', error);
      // Fall back to sample content
      loadSampleContent();
    } finally {
      setLoading(false);
    }
  };

  const validateXML = (xmlContent) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

      const parseError = xmlDoc.getElementsByTagName('parsererror');
      if (parseError.length > 0) {
        setValidation({
          valid: false,
          error: parseError[0].textContent
        });
      } else {
        setValidation({ valid: true, error: null });
      }
    } catch (error) {
      setValidation({
        valid: false,
        error: error.message
      });
    }
  };

  const formatXML = () => {
    try {
      const formatted = formatXMLString(content);
      setContent(formatted);
    } catch (error) {
      console.error('Error formatting XML:', error);
    }
  };

  const formatXMLString = (xml) => {
    const PADDING = '    ';
    const reg = /(>)(<)(\/*)/g;
    let formatted = '';
    let pad = 0;

    xml = xml.replace(reg, '$1\r\n$2$3');

    xml.split('\r\n').forEach(node => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) {
          pad -= 1;
        }
      } else if (node.match(/^<\w([^>]*[^\/])?>.*$/)) {
        indent = 1;
      } else {
        indent = 0;
      }

      formatted += PADDING.repeat(pad) + node + '\r\n';
      pad += indent;
    });

    return formatted.trim();
  };

  const saveFile = async () => {
    if (!validation.valid) {
      setShowValidation(true);
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual API call to save file
      console.log('Saving to:', currentFile);
      console.log('Content length:', content.length);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setOriginalContent(content);
      setIsModified(false);

      // Show success message
      alert('File saved successfully!');
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Error saving file');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = () => {
    const blob = new Blob([content], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile || 'config.xml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const uploadFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target.result;
      setContent(fileContent);
      setOriginalContent(fileContent);
      setCurrentFile(file.name);
    };
    reader.readAsText(file);
  };

  const revertChanges = () => {
    if (window.confirm('Are you sure you want to revert all changes?')) {
      setContent(originalContent);
      setIsModified(false);
    }
  };

  const searchInContent = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const lines = content.split('\n');
    const results = [];

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({
          lineNumber: index + 1,
          line: line,
          index: line.toLowerCase().indexOf(searchQuery.toLowerCase())
        });
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);

    if (results.length > 0) {
      // Scroll to first result
      scrollToLine(results[0].lineNumber);
    }
  };

  const scrollToLine = (lineNumber) => {
    if (textareaRef.current) {
      const lines = content.split('\n');
      const lineHeight = fontSize * 1.5; // Approximate line height
      const scrollTop = (lineNumber - 1) * lineHeight;
      textareaRef.current.scrollTop = scrollTop;
    }
  };

  const nextSearchResult = () => {
    if (searchResults.length > 0) {
      const nextIndex = (currentSearchIndex + 1) % searchResults.length;
      setCurrentSearchIndex(nextIndex);
      scrollToLine(searchResults[nextIndex].lineNumber);
    }
  };

  const prevSearchResult = () => {
    if (searchResults.length > 0) {
      const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
      setCurrentSearchIndex(prevIndex);
      scrollToLine(searchResults[prevIndex].lineNumber);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content).then(() => {
      alert('Content copied to clipboard!');
    });
  };

  const handleKeyDown = (e) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          saveFile();
          break;
        case 'f':
          e.preventDefault();
          // Focus search
          document.getElementById('search-input')?.focus();
          break;
        case 'a':
          e.preventDefault();
          // Select all
          if (textareaRef.current) {
            textareaRef.current.select();
          }
          break;
      }
    }
  };

  return (
    <div className="config-editor">
      <div className="editor-header">
        <div className="editor-title">
          <FiFile className="me-2" />
          XML Configuration Editor
          {currentFile && <span className="current-file"> - {currentFile}</span>}
          {isModified && <span className="modified-indicator"> *</span>}
        </div>

        <div className="editor-controls">
          <div className="file-selector">
            <select
              value={currentFile}
              onChange={(e) => loadFile(e.target.value)}
              className="form-select form-select-sm"
            >
              <option value="">Choose a file...</option>
              {sampleFiles.map(file => (
                <option key={file.value} value={file.path}>
                  {file.label}
                </option>
              ))}
            </select>
          </div>

          <div className="view-mode-toggle">
            <button
              className={`btn btn-sm ${viewMode === 'edit' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('edit')}
            >
              <FiEdit3 className="me-1" />
              Edit
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'preview' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('preview')}
            >
              <FiEye className="me-1" />
              Preview
            </button>
          </div>
        </div>
      </div>

      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button
            className="btn btn-sm btn-success"
            onClick={saveFile}
            disabled={!isModified && !validation.valid}
          >
            <FiSave className="me-1" />
            Save
          </button>

          <button
            className="btn btn-sm btn-warning"
            onClick={revertChanges}
            disabled={!isModified}
          >
            <FiRotateCcw className="me-1" />
            Revert
          </button>

          <button
            className="btn btn-sm btn-info"
            onClick={formatXML}
          >
            <FaIndent className="me-1" />
            Format
          </button>

          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowValidation(!showValidation)}
          >
            <FiCheck className="me-1" />
            Validate
          </button>

          <div className="divider"></div>

          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={downloadFile}
          >
            <FiDownload className="me-1" />
            Download
          </button>

          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <FiUpload className="me-1" />
            Upload
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xml"
            style={{ display: 'none' }}
            onChange={uploadFile}
          />

          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={copyToClipboard}
          >
            <FiCopy className="me-1" />
            Copy
          </button>
        </div>

        <div className="toolbar-right">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              id="search-input"
              type="text"
              placeholder="Search in XML..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  searchInContent();
                } else if (e.key === 'F3') {
                  e.preventDefault();
                  nextSearchResult();
                }
              }}
            />
            {searchResults.length > 0 && (
              <div className="search-results">
                {currentSearchIndex + 1}/{searchResults.length}
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={prevSearchResult}
                >
                  ▲
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={nextSearchResult}
                >
                  ▼
                </button>
              </div>
            )}
          </div>

          <div className="editor-settings">
            <label className="form-check form-check-inline">
              <input
                type="checkbox"
                checked={showLineNumbers}
                onChange={(e) => setShowLineNumbers(e.target.checked)}
                className="form-check-input"
              />
              <span className="form-check-label">Line Numbers</span>
            </label>

            <label className="form-check form-check-inline">
              <input
                type="checkbox"
                checked={showWordWrap}
                onChange={(e) => setShowWordWrap(e.target.checked)}
                className="form-check-input"
              />
              <span className="form-check-label">Word Wrap</span>
            </label>

            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="form-select form-select-sm"
            >
              <option value="12">12px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
              <option value="18">18px</option>
            </select>
          </div>
        </div>
      </div>

      {/* Validation Status */}
      {showValidation && (
        <div className={`validation-status ${validation.valid ? 'valid' : 'invalid'}`}>
          {validation.valid ? (
            <div className="validation-success">
              <FiCheckCircle className="me-2" />
              XML is valid and well-formed
            </div>
          ) : (
            <div className="validation-error">
              <FiAlertTriangle className="me-2" />
              Validation Error: {validation.error}
            </div>
          )}
          <button
            className="btn-close"
            onClick={() => setShowValidation(false)}
          >
            <FiX />
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div className="editor-content">
        {loading ? (
          <div className="editor-loading">
            <div className="spinner"></div>
            <p>Loading file...</p>
          </div>
        ) : viewMode === 'edit' ? (
          <div className="editor-textarea-container">
            {showLineNumbers && (
              <div className="line-numbers">
                {content.split('\n').map((_, index) => (
                  <div key={index} className="line-number">
                    {index + 1}
                  </div>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`editor-textarea ${showWordWrap ? 'word-wrap' : ''}`}
              style={{ fontSize: `${fontSize}px` }}
              spellCheck={false}
              placeholder="Enter XML content here..."
            />
          </div>
        ) : (
          <div className="editor-preview">
            <pre className="xml-preview">{content}</pre>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="editor-status">
        <div className="status-left">
          {currentFile && <span className="status-item">File: {currentFile}</span>}
          <span className="status-item">Lines: {content.split('\n').length}</span>
          <span className="status-item">Characters: {content.length}</span>
          {isModified && <span className="status-item modified">Modified</span>}
        </div>
        <div className="status-right">
          <span className={`status-item ${validation.valid ? 'valid' : 'invalid'}`}>
            {validation.valid ? '✓ Valid XML' : '✗ Invalid XML'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ConfigEditor;
