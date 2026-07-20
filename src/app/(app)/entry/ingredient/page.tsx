import Link from 'next/link';
import { getIngredients } from '@/lib/queries';
import { PageHeader, Card } from '@/components/ui';
import IngredientForm from './ingredient-form';

export const dynamic = 'force-dynamic';

export default async function IngredientEntryPage() {
  const ingredients = await getIngredients();

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Nhập bột / gia vị"
        subtitle="Ghi số kg bột mì, bột năng, muối, đường nhập vào"
        action={
          <Link href="/ingredients" className="text-sm text-accent hover:underline">
            Xem tồn kho →
          </Link>
        }
      />
      <Card className="p-6">
        <IngredientForm ingredients={ingredients} />
      </Card>
      <p className="mt-4 text-xs text-muted">
        Tồn kho = kg nhập − (số bánh bán + tặng × định mức mỗi bánh). Nếu đầu tháng 7
        còn hàng cũ chưa ghi, hãy thêm một dòng &quot;tồn đầu kỳ&quot; ngày 01/07 với
        số kg còn lại để tồn kho khớp thực tế.
      </p>
    </div>
  );
}
