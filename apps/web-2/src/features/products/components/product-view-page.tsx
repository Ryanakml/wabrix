'use client';

import type { Product } from '../api/types';
import { notFound } from 'next/navigation';
import ProductForm from './product-form';
import { getProductById } from '../api/service';
import { useEffect, useState } from 'react';

type TProductViewPageProps = {
  productId: string;
};

export default function ProductViewPage({ productId }: TProductViewPageProps) {
  if (productId === 'new') {
    return <ProductForm initialData={null} pageTitle='Create New Product' />;
  }

  return <EditProductView productId={Number(productId)} />;
}

function EditProductView({ productId }: { productId: number }) {
  // Temporary: load mock data directly. Will be replaced with Convex useQuery.
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProductById(productId)
      .then((data) => {
        if (data?.success && data?.product) {
          setProduct(data.product as Product);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className='flex flex-1 animate-pulse flex-col gap-4'>
        <div className='bg-muted h-10 w-full rounded' />
        <div className='bg-muted h-96 w-full rounded-lg' />
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  return <ProductForm initialData={product} pageTitle='Edit Product' />;
}
