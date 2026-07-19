'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/format';
import type { CustomerStats } from '@/lib/queries';
import { deleteCustomer } from './actions';

const n = (v: number | null) => Number(v ?? 0).toLocaleString('vi-VN');

/** Số khách được đánh dấu VIP (mua nhiều nhất). */
const VIP_COUNT = 5;

type SortKey = 'qty' | 'date';
type Dir = 'asc' | 'desc';

/** Xếp hạng "mua nhiều": tổng bánh giảm dần, hòa nhau thì theo lượt mua. */
function rankValue(c: CustomerStats): number {
  return Number(c.total_qty) * 1000 + Number(c.order_count);
}

/** Mốc thời gian mua gần nhất (ms); null = 0 (đẩy xuống cuối khi mới→cũ). */
function dateValue(c: CustomerStats): number {
  return c.last_order ? new Date(c.last_order).getTime() : 0;
}

export function CustomerTable({
  customers,
  isOwner,
}: {
  customers: CustomerStats[];
  isOwner: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('qty');
  const [dir, setDir] = useState<Dir>('desc');

  // Tập VIP = 5 khách mua nhiều nhất (chỉ tính khách đã có lượt mua), cố định
  // bất kể đang sắp xếp kiểu nào.
  const vipIds = useMemo(() => {
    const ranked = [...customers]
      .filter((c) => Number(c.order_count) > 0)
      .sort((a, b) => rankValue(b) - rankValue(a))
      .slice(0, VIP_COUNT);
    return new Set(ranked.map((c) => c.id));
  }, [customers]);

  const sorted = useMemo(() => {
    const val = sortKey === 'qty' ? rankValue : dateValue;
    const arr = [...customers].sort((a, b) => val(a) - val(b));
    if (dir === 'desc') arr.reverse();
    return arr;
  }, [customers, sortKey, dir]);

  // Bấm nút đang chọn → đảo chiều; bấm nút khác → chuyển tiêu chí (mặc định giảm dần).
  const pick = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(key);
      setDir('desc');
    }
  };

  const arrow = (key: SortKey) => (key === sortKey ? (dir === 'desc' ? ' ↓' : ' ↑') : '');

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Sắp xếp:</span>
        <SortButton active={sortKey === 'qty'} onClick={() => pick('qty')}>
          Mua nhiều nhất{arrow('qty')}
        </SortButton>
        <SortButton active={sortKey === 'date'} onClick={() => pick('date')}>
          Theo ngày mua{arrow('date')}
        </SortButton>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-100 ring-1 ring-amber-400" />
          Top {VIP_COUNT} VIP
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-2 font-medium">SĐT</th>
              <th className="px-4 py-2 font-medium">Tên</th>
              <th className="px-4 py-2 font-medium">Địa chỉ</th>
              <th className="px-4 py-2 font-medium text-right">Lượt mua</th>
              <th className="px-4 py-2 font-medium text-right">Tổng bánh</th>
              <th className="px-4 py-2 font-medium">Hay mua</th>
              <th className="px-4 py-2 font-medium">Mua gần nhất</th>
              {isOwner && <th className="px-4 py-2 font-medium text-right">Xóa</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const vip = vipIds.has(c.id);
              return (
                <tr
                  key={c.id}
                  className={`border-b border-border last:border-0 ${
                    vip ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-background'
                  }`}
                >
                  <td className="px-4 py-2 tabular">
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-accent hover:underline font-medium"
                    >
                      {c.phone}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      {vip && (
                        <span className="rounded-sm bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                          ★ VIP
                        </span>
                      )}
                      {c.name ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted max-w-[220px] truncate">{c.address ?? '—'}</td>
                  <td className="px-4 py-2 text-right tabular">{n(c.order_count)}</td>
                  <td className="px-4 py-2 text-right tabular">{n(c.total_qty)}</td>
                  <td className="px-4 py-2">{c.top_cake ?? '—'}</td>
                  <td className="px-4 py-2 tabular">{c.last_order ? formatDate(c.last_order) : '—'}</td>
                  {isOwner && (
                    <td className="px-4 py-2 text-right">
                      <form action={deleteCustomer}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-negative hover:underline text-xs">
                          Xóa
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'border-accent bg-accent text-accent-fg'
          : 'border-border text-foreground hover:border-accent'
      }`}
    >
      {children}
    </button>
  );
}
