import { memo, useMemo } from 'react';
import AgGridWrapper from '../grid/AgGridWrapper';

function ProjectGrid({ rowData }) {
  const columnDefs = useMemo(() => [
    { field: 'projectId', headerName: 'Project ID', minWidth: 120 },
    { field: 'title', headerName: 'Project Title', flex: 1, minWidth: 220 },
    { field: 'client', headerName: 'Client', minWidth: 120, rowGroup: true },
    { field: 'owner', headerName: 'Owner', minWidth: 140 },
    { field: 'progress', headerName: 'Progress %', minWidth: 120, aggFunc: 'avg' },
    { field: 'status', headerName: 'Status', minWidth: 120 }
  ], []);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Project Management</h3>
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

export default memo(ProjectGrid);
