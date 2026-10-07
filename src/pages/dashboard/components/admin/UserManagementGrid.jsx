import { memo, useMemo } from 'react';
import AgGridWrapper from '../grid/AgGridWrapper';

function UserManagementGrid({ rowData }) {
  const columnDefs = useMemo(() => [
    { field: 'userId', headerName: 'User ID', minWidth: 110 },
    { field: 'name', headerName: 'Name', minWidth: 160 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
    { field: 'role', headerName: 'Role', minWidth: 120, rowGroup: true },
    { field: 'status', headerName: 'Status', minWidth: 120 },
    { field: 'lastLogin', headerName: 'Last Login', minWidth: 160 }
  ], []);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">User Management</h3>
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

export default memo(UserManagementGrid);
