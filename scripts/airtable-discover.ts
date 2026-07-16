/**
 * Dò schema base Airtable: liệt kê bảng, trường và kiểu dữ liệu.
 * Chạy: npm run airtable:discover
 *
 * Cần trong .env.local:
 *   AIRTABLE_TOKEN=pat...        (Personal Access Token, scope schema.bases:read)
 *   AIRTABLE_BASE_ID=app...      (Base ID, lấy từ URL base)
 *
 * Đây là bước ĐẦU TIÊN của migration: xem base thật có gì trước khi chỉnh
 * schema Postgres (supabase/migrations/0001_init.sql) cho khớp.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

async function main() {
  if (!TOKEN || !BASE_ID) {
    console.error(
      'Thiếu AIRTABLE_TOKEN hoặc AIRTABLE_BASE_ID trong .env.local.\n' +
        'Tạo token tại https://airtable.com/create/tokens (scope: schema.bases:read, data.records:read).',
    );
    process.exit(1);
  }

  const res = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );

  if (!res.ok) {
    console.error(`Airtable API lỗi ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const { tables } = (await res.json()) as {
    tables: {
      id: string;
      name: string;
      fields: { id: string; name: string; type: string }[];
    }[];
  };

  console.log(`\nBase ${BASE_ID} có ${tables.length} bảng:\n`);
  for (const t of tables) {
    console.log(`■ ${t.name}  (id: ${t.id}, ${t.fields.length} trường)`);
    for (const f of t.fields) {
      console.log(`    - ${f.name.padEnd(28)} ${f.type}`);
    }
    console.log('');
  }

  console.log(
    'Bước tiếp theo: đưa output này cho Claude Code để chỉnh schema Postgres\n' +
      'và cấu hình mapping trong scripts/airtable-migrate.ts.\n',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
