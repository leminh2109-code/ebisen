import { redirect } from 'next/navigation';
import { getCurrentRole } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/ui';

export const dynamic = 'force-dynamic';

type Doc = {
  id: string;
  name: string;
  category: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  created_at: string;
};

export default async function DocumentsPage() {
  const role = await getCurrentRole();
  if (role !== 'owner') redirect('/dashboard');

  const supabase = await createClient();
  const { data: rawDocs } = await (supabase as any)
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });
  const docs: Doc[] = rawDocs ?? [];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Tài liệu"
        subtitle="Lưu trữ giấy tờ pháp lý, an toàn thực phẩm, hợp đồng và các tài liệu kinh doanh khác."
      />
      <Card>
        {docs.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            Chưa có tài liệu nào. (Upload form đang được thêm lại.)
          </p>
        ) : (
          <p className="px-4 py-4 text-sm">{docs.length} tài liệu.</p>
        )}
      </Card>
    </div>
  );
}
