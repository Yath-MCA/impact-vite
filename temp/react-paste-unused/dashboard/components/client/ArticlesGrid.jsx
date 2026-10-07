import { memo, useMemo } from 'react';
import AgGridWrapper from '../grid/AgGridWrapper';

function ArticlesGrid({ rowData }) {
  const columnDefs = useMemo(() => [
    { field: 'articleId', headerName: 'Article ID', minWidth: 120 },
    { field: 'title', headerName: 'Title', flex: 1, minWidth: 220 },
    { field: 'journal', headerName: 'Journal', minWidth: 140 },
    { field: 'stage', headerName: 'Stage', minWidth: 140 },
    { field: 'queries', headerName: 'Open Queries', minWidth: 130 },
    { field: 'deadline', headerName: 'Deadline', minWidth: 140 }
  ], []);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Articles Grid</h3>
      <div className="h-[360px]">
        <AgGridWrapper
          rowData={rowData}
          columnDefs={columnDefs}
          pagination
          paginationPageSize={10}
        />
      </div>
    </section>
  );
}

export default memo(ArticlesGrid);
