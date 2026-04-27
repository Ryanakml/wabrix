'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { columns } from './columns';
import { useEffect, useState } from 'react';
import { getUsers } from '../../api/service';
import type { User } from '../../api/types';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

export function UsersTable() {
  const [params] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    name: parseAsString,
    role: parseAsString,
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  // Temporary: load mock data directly. Will be replaced with Convex useQuery.
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    const filters = {
      page: params.page,
      limit: params.perPage,
      ...(params.name && { search: params.name }),
      ...(params.role && { roles: params.role }),
      ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
    };
    getUsers(filters).then((data) => {
      setUsers(data.users);
      setTotalUsers(data.total_users);
    });
  }, [params]);

  const pageCount = Math.ceil(totalUsers / params.perPage);

  const { table } = useDataTable({
    data: users,
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    initialState: {
      columnPinning: { right: ['actions'] }
    }
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}

export function UsersTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
