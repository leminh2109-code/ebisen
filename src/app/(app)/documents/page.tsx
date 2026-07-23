import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
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

const CATEGORIES = ['Pháp lý', 'An toàn thực phẩm', 'Hợp đồng', 'Thuế & Kế toán', 'Khác'];
const CATEGORY_ORDER = CATEGORIES;

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

const inputCls =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string; deleted?: string; error?: string }>;
}) {
  const role = await getCurrentRole();
  if (role !== 'owner') redirect('/dashboard');

  const sp = await searchParams;

  // ── Server actions ──────────────────────────────────────────────────────────

  async function uploadDocument(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'owner') return;

    const file = formData.get('file') as File | null;
    const name = (formData.get('name') as string)?.trim();
    const category = (formData.get('category') as string)?.trim();
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!file || file.size === 0 || !name || !category) {
      redirect('/documents?error=missing');
    }

    const ext = file.name.split('.').pop() ?? 'bin';
    const storagePath = `${crypto.randomUUID()}.${ext}`;

    const { error: storageErr } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, { contentType: file.type });
    if (storageErr) redirect('/documents?error=storage');

    await (supabase as any).from('documents').insert({
      name, category, storage_path: storagePath,
      file_name: file.name, file_size: file.size, mime_type: file.type,
      notes, uploaded_by: user.id,
    });

    revalidatePath('/documents');
    redirect('/documents?uploaded=1');
  }

  async function deleteDocument(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'owner') return;

    const id = formData.get('id') as string;
    const storagePath = formData.get('storage_path') as string;
    await supabase.storage.from('documents').remove([storagePath]);
    await (supabase as any).from('documents').delete().eq('id', id);

    revalidatePath('/documents');
    redirect('/documents?deleted=1');
  }

  // ── Data ───────────────────────────────────────────────────────────────────

  const supabase = await createClient();
  const { data: rawDocs } = await (supabase as any)
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });
  const docs: Doc[] = rawDocs ?? [];

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

      {sp.uploaded && (
        <p className="mb-4 rounded-lg bg-accent/10 px-4 py-2 text-sm text-accent">
          Tải lên thành công.
        </p>
      )}
      {sp.deleted && (
        <p className="mb-4 rounded-lg bg-accent/10 px-4 py-2 text-sm text-accent">
          Đã xóa tài liệu.
        </p>
      )}
      {sp.error && (
        <p className="mb-4 rounded-lg bg-negative/10 px-4 py-2 text-sm text-negative">
          Lỗi: {sp.error === 'missing' ? 'Thiếu thông tin bắt buộc.' : 'Không tải được file.'}
        </p>
      )}

      <Card title="Tải lên tài liệu mới" className="mb-6">
        <form action={uploadDocument} className="space-y-3 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Tên tài liệu <span className="text-negative">*</span>
              </label>
              <input name="name" type="text" placeholder="Giấy chứng nhận ĐKKD" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Danh mục <span className="text-negative">*</span>
              </label>
              <select name="category" required className={inputCls}>
                <option value="">— Chọn danh mục —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              File <span className="text-negative">*</span>
              <span className="ml-1 font-normal text-muted text-xs">(PDF, JPG, PNG, HEIC · tối đa 50MB)</span>
            </label>
            <input
              name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" required
              className="w-full rounded-lg border border-border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-accent hover:file:bg-accent/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Ghi chú</label>
            <input name="notes" type="text" placeholder="VD: Cấp ngày 01/01/2026, hết hạn 31/12/2028" className={inputCls} />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
              Tải lên
            </button>
          </div>
        </form>
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
                        {doc.notes && <p className="text-xs text-muted mt-0.5 italic">{doc.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {url && (
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:border-accent hover:text-accent">
                            Xem
                          </a>
                        )}
                        <form action={deleteDocument}>
                          <input type="hidden" name="id" value={doc.id} />
                          <input type="hidden" name="storage_path" value={doc.storage_path} />
                          <button type="submit"
                            className="rounded-md border border-negative/40 px-2.5 py-1 text-xs font-medium text-negative hover:bg-negative/10">
                            Xóa
                          </button>
                        </form>
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
