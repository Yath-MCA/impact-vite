import React, { useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-enterprise'; // enable enterprise features

export default function DocsGrid({ rowData = [], onOpen }) {
  const gridRef = useRef();

  const columnDefs = useMemo(() => [
    { headerName: 'Client', field: 'client', sortable: true, filter: true },
    { headerName: 'Identifier', field: 'identifier', sortable: true, filter: true },
    { headerName: 'DocID', field: 'docid', sortable: true, filter: true },
    { headerName: 'Status', field: 'status', sortable: true, filter: true },
    // { headerName: 'Journal', field: 'titleinfo.cover', valueGetter: params => params.data?.titleinfo?.cover },
    // { headerName: 'Project Title', field: 'projecttitle' },
    { headerName: 'Role Name', field: 'rolename' },
    {
      headerName: 'Open Link', field: 'editor', cellRenderer: params => {
        const rec = params.data || {};
        return (
          <button
            style={{ background: '#a79e99', color: '#fff', border: 'none', padding: '4px 8px' }}
            onClick={() => {
              if (onOpen) return onOpen(rec);
              try {
                const base = location.href.split('/');
                base.pop();
                const url = base.join('/') + '/' + (rec.editor || '');
                window.open(url, '_blank');
              } catch (e) {
                console.error(e);
              }
            }}
          >
            Open
          </button>
        );
      }
    }
  ], [onOpen]);

  const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), []);

  return (
    <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection="single"
        animateRows
      />
    </div>
  );
}
