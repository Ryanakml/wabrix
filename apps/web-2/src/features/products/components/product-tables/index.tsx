'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { columns } from './columns';
import { useEffect, useState } from 'react';
import { getProducts } from '../../api/service';
import type { Product } from '../../api/types';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

export function ProductTable() {
  const [params] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    name: parseAsString,
    category: parseAsString,
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  // Temporary: load mock data directly. Will be replaced with Convex useQuery.
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    const filters = {
      page: params.page,
      limit: params.perPage,
      ...(params.name && { search: params.name }),
      ...(params.category && { categories: params.category }),
      ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
    };
    getProducts(filters).then((data) => {
      setProducts(data.products);
      setTotalProducts(data.total_products);
    });
  }, [params]);

  const pageCount = Math.ceil(totalProducts / params.perPage);

  const { table } = useDataTable({
    data: products,
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
