import { searchParamsCache } from '@/lib/searchparams';
import { ProductTable } from './product-tables';

export default function ProductListingPage() {
  // Search params are still parsed for future Convex query integration
  const _page = searchParamsCache.get('page');
  const _search = searchParamsCache.get('name');
  const _pageLimit = searchParamsCache.get('perPage');
  const _categories = searchParamsCache.get('category');
  const _sort = searchParamsCache.get('sort');

  return <ProductTable />;
}
