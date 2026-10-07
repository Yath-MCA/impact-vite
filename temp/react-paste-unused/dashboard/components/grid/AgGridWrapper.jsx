import { memo, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

function AgGridWrapper({
  rowData,
  columnDefs,
  defaultColDef,
  pagination = true,
  paginationPageSize = 20,
  serverSideDatasource,
  onGridReady,
  className = '',
  rowModelType,
  ...rest
}) {
  const gridApiRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const loadEnterprise = async () => {
      try {
        const packageName = 'ag-grid-enterprise';
        await import(/* @vite-ignore */ packageName);
      } catch {
        if (mounted) {
          console.warn('ag-grid-enterprise is not installed. Running in community mode.');
        }
      }
    };

    loadEnterprise();
    return () => {
      mounted = false;
    };
  }, []);

  const resolvedDefaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true,
    ...defaultColDef
  }), [defaultColDef]);

  return (
    <div className={`ag-theme-alpine h-full w-full ${className}`.trim()}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={resolvedDefaultColDef}
        pagination={pagination}
        paginationPageSize={paginationPageSize}
        rowGroupPanelShow="always"
        sideBar={{ toolPanels: ['columns', 'filters'] }}
        animateRows
        enableCellTextSelection
        suppressAggFuncInHeader={false}
        enableRangeSelection
        rowModelType={rowModelType || (serverSideDatasource ? 'serverSide' : 'clientSide')}
        onGridReady={(params) => {
          gridApiRef.current = params.api;
          if (serverSideDatasource) {
            params.api.setGridOption('serverSideDatasource', serverSideDatasource);
          }
          if (onGridReady) onGridReady(params);
        }}
        {...rest}
      />
    </div>
  );
}

export default memo(AgGridWrapper);
