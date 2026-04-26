import { searchParamsCache } from '@/lib/searchparams';
import { UsersTable } from './users-table';

export default function UserListingPage() {
  // Search params are still parsed for future Convex query integration
  const _page = searchParamsCache.get('page');
  const _search = searchParamsCache.get('name');
  const _pageLimit = searchParamsCache.get('perPage');
  const _roles = searchParamsCache.get('role');
  const _sort = searchParamsCache.get('sort');

  return <UsersTable />;
}
