import { redirect } from 'next/navigation';
import { getCurrentRole } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/ui';
import { UploadForm } from './upload-form';
import { DeleteDocumentButton } from './delete-button';

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

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const CATEGORY_ORDER = ['Pháp lý', 'An toàn thực phẩm', 'Hợp đồng', 'Thuế & Kế toán', 'Khác'];

export default async function DocumentsPage() {
  const role = await getCurrentRole();
  if (role !== 'owner') redirect('/dashboard');

  const supabase = await createClient();

  const { data: rawDocs } = await (supabase as any)
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  const docs: Doc[] = rawDocs ?? [];

  // Generate signed URLs (valid 1 hour)
  const paths = docs.map((d) => d.storage_path);
  const signedMap: Record<string, string> = {};
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('documents')
      .createSignedUrls(paths, 3600);
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) signedMap[s.path] = s.signedUrl;
    });
  }

  // Group by category
  const byCategory: Record<string, Doc[]> = {};
  for (const doc of docs) {
    if (!byCategory[doc.category]) byCategory[doc.category] = [];
    byCategory[doc.category].push(doc);
  }
  const categories = [
    ...CATEGORY_ORDER.filter((c) => byCategory[c]),
    ...Object.keys(byCategory).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Tài liệu"
        subtitle="Lưu trữ giấy tờ pháp lý, an toàn thực phẩm, hợp đồng và các tài liệu kinh doanh khác."
      />

      <Card title="Tải lên tài liệu mới" className="mb-6">
        <div className="p-4">
          <UploadForm />
        </div>
      </Card>

      {docs.length === 0 ? (
        <Card>
          <p className="px-4 py-8 text-center text-sm text-muted">Chưa có tài liệu nào.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <Card key={cat} title={cat}>
              <div className="divide-y divide-border">
                {byCategory[cat].map((doc) => {
                  const url = signedMap[doc.storage_path];
                  const isPdf = doc.mime_type === 'application/pdf';
                  return (
                    <div key={doc.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 text-xl">{isPdf ? '📄' : '🖼️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {doc.file_name}
                          {doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ''}
                          {' · '}Tải lên {formatDate(doc.created_at)}
                        </p>
                        {doc.notes && (
                          <p className="text-xs text-muted mt-0.5 italic">{doc.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:border-accent hover:text-accent"
                          >
                            Xem
                          </a>
                        )}
                        <DeleteDocumentButton
                          id={doc.id}
                          storagePath={doc.storage_path}
                          name={doc.name}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
