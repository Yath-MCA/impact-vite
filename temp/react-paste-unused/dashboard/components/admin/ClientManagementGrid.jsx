import { memo, useMemo } from 'react';
import AgGridWrapper from '../grid/AgGridWrapper';

function ClientManagementGrid({ rowData }) {
  const columnDefs = useMemo(() => [
    { field: 'clientId', headerName: 'Client ID', minWidth: 110 },
    { field: 'name', headerName: 'Client Name', minWidth: 180 },
    { field: 'projects', headerName: 'Projects', minWidth: 110, aggFunc: 'sum' },
    { field: 'activeUsers', headerName: 'Active Users', minWidth: 130, aggFunc: 'sum' },
    { field: 'sla', headerName: 'SLA', minWidth: 100 },
    { field: 'health', headerName: 'Health', minWidth: 100 }
  ], []);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Client Management</h3>
      <div className="h-[300px]">
        <AgGridWrapper
          rowData={rowData}
          columnDefs={columnDefs}
          paginationPageSize={8}
        />
      </div>
    </section>
  );
}

export default memo(ClientManagementGrid);
