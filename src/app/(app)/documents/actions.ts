'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, error: 'Chưa đăng nhập' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return { supabase: null, error: 'Không có quyền' };
  return { supabase, user, error: null };
}

export type ActionState = { ok: boolean; error: string | null };

export async function uploadDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, error } = await requireOwner();
  if (error || !supabase || !user) return { ok: false, error: error ?? 'Lỗi' };

  const file = formData.get('file') as File | null;
  const name = (formData.get('name') as string)?.trim();
  const category = (formData.get('category') as string)?.trim();
  const notes = (formData.get('notes') as string)?.trim() || null;

  if (!file || file.size === 0) return { ok: false, error: 'Chưa chọn file' };
  if (!name) return { ok: false, error: 'Chưa nhập tên tài liệu' };
  if (!category) return { ok: false, error: 'Chưa chọn danh mục' };

  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: storageErr } = await supabase.storage
    .from('documents')
    .upload(path, file, { contentType: file.type });
  if (storageErr) return { ok: false, error: storageErr.message };

  const { error: dbErr } = await (supabase as any).from('documents').insert({
    name,
    category,
    storage_path: path,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    notes,
    uploaded_by: user.id,
  });
  if (dbErr) {
    await supabase.storage.from('documents').remove([path]);
    return { ok: false, error: dbErr.message };
  }

  revalidatePath('/documents');
  return { ok: true, error: null };
}

export async function deleteDocument(formData: FormData): Promise<void> {
  const { supabase, error } = await requireOwner();
  if (error || !supabase) return;

  const id = formData.get('id') as string;
  const storagePath = formData.get('storage_path') as string;

  await supabase.storage.from('documents').remove([storagePath]);
  await (supabase as any).from('documents').delete().eq('id', id);

  revalidatePath('/documents');
}
