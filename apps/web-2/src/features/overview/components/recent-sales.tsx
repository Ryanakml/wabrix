import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '../lib/formatters';

type RecentSalesProps = {
  data: {
    currentMonthSalesCount: number;
    sales: Array<{
      id: string;
      name: string;
      email: string;
      avatar: string | null;
      fallback: string;
      amount: number;
      currency: 'USD' | 'IDR';
    }>;
  };
};

export function RecentSales({ data }: RecentSalesProps) {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
        <CardDescription>You made {data.currentMonthSalesCount} sales this month.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-8'>
          {data.sales.length === 0 ? (
            <p className='text-muted-foreground text-sm'>No billing events recorded yet.</p>
          ) : (
            data.sales.map((sale) => (
              <div key={sale.id} className='flex items-center'>
                <Avatar className='h-9 w-9'>
                  <AvatarImage src={sale.avatar ?? undefined} alt='Avatar' />
                  <AvatarFallback>{sale.fallback}</AvatarFallback>
                </Avatar>
                <div className='ml-4 space-y-1'>
                  <p className='text-sm leading-none font-medium'>{sale.name}</p>
                  <p className='text-muted-foreground text-sm'>{sale.email}</p>
                </div>
                <div className='ml-auto font-medium'>
                  {formatCurrency(sale.amount, sale.currency)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
