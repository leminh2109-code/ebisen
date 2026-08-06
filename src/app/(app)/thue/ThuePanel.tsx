'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui';

const DEADLINES = [
  { id: 'khai-2027', label: 'Khai DT khoán 2027',   sub: 'Khai thu nhập năm 2027', date: '2026-12-15', type: 'Khai báo' },
  { id: 'h2-2026',   label: 'Thuế khoán H2/2026',   sub: 'Tháng 7–12/2026',        date: '2027-01-10', type: 'Khoán 6 tháng' },
  { id: 'mb-2027',   label: 'Thuế môn bài 2027',    sub: '1.000.000đ/năm',         date: '2027-01-30', type: 'Môn bài' },
  { id: 'h1-2027',   label: 'Thuế khoán H1/2027',   sub: 'Tháng 1–6/2027',         date: '2027-07-10', type: 'Khoán 6 tháng' },
];

const COMPLETED_KY = [
  { id: 'h1-2026', label: 'Thuế khoán H1/2026', sub: 'Tháng 1–6/2026', note: 'Đã khai xong' },
];

const KY_OPTIONS = [
  'Thuế khoán H2/2026 (T7–T12)',
  'Khai DT khoán năm 2027',
  'Thuế môn bài 2027',
  'Thuế khoán H1/2027 (T1–T6)',
  'Thuế khoán H2/2027 (T7–T12)',
];

type TaxRecord = {
  ky: string;
  dt: number;
  khoan: number;
  status: 'pending' | 'paid';
  date: string;
  note: string;
  ts: number;
};

type Status = 'ok' | 'warn' | 'danger';

function daysLeft(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const t = new Date(dateStr); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - now.getTime()) / 86400000);
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function vnd(n: number): string {
  return Math.round(n).toLocaleString('vi-VN') + ' đ';
}

function statusOf(days: number): Status {
  if (days < 0 || days <= 14) return 'danger';
  if (days <= 45) return 'warn';
  return 'ok';
}

const STATUS_BORDER: Record<Status, string> = {
  ok: '#16a34a',
  warn: '#d97706',
  danger: '#dc2626',
};

const STATUS_TEXT: Record<Status, string> = {
  ok: '#16a34a',
  warn: '#d97706',
  danger: '#dc2626',
};

function calHref(dl: typeof DEADLINES[number]): string {
  const d = new Date(dl.date);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (dt: Date) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
  const start = fmt(d);
  const next = new Date(d); next.setDate(next.getDate() + 1);
  const end = fmt(next);
  const text = encodeURIComponent(`${dl.label} — EBISEN`);
  const details = encodeURIComponent('Khai thuế hộ kinh doanh EBISEN. eTax: etax.gdt.gov.vn');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
}

const ETAX_STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'Đăng nhập eTax',
    body: (
      <>
        Vào{' '}
        <code className="rounded border border-border bg-background px-1 py-0.5 text-xs font-mono text-accent">
          etax.gdt.gov.vn
        </code>
        , đăng nhập bằng MST và mật khẩu được cấp khi đăng ký hộ kinh doanh.
      </>
    ),
  },
  {
    title: 'Nộp tờ khai',
    body: (
      <>
        Khai thuế → Khai trực tuyến → chọn mẫu{' '}
        <code className="rounded border border-border bg-background px-1 py-0.5 text-xs font-mono text-accent">
          01/CNKD
        </code>{' '}
        → điền doanh thu ước tính → gửi. Làm lần đầu hoặc khi doanh thu thay đổi lớn.
      </>
    ),
  },
  {
    title: 'Nhận thông báo thuế khoán',
    body: 'Chi cục thuế duyệt và gửi số thuế khoán từng quý. Lưu số tiền này vào trang này để theo dõi.',
  },
  {
    title: 'Nộp thuế đúng hạn',
    body: 'Nộp thuế → chọn khoản → thanh toán qua ngân hàng liên kết (Vietcombank, Agribank, VPBank…) hoặc chuyển khoản vào tài khoản kho bạc Nhà nước.',
  },
  {
    title: 'Lưu biên lai',
    body: 'Tải biên lai điện tử về máy; ghi số biên lai vào ô ghi chú ở trên. Lưu giữ ít nhất 5 năm theo quy định.',
  },
];

export default function ThuePanel() {
  const [calcDt, setCalcDt] = useState('');
  const [calcKhoan, setCalcKhoan] = useState('');

  const [fKy, setFKy] = useState('');
  const [fDt, setFDt] = useState('');
  const [fKhoan, setFKhoan] = useState('');
  const [fStatus, setFStatus] = useState<'pending' | 'paid'>('pending');
  const [fDate, setFDate] = useState('');
  const [fNote, setFNote] = useState('');
  const [saveOk, setSaveOk] = useState(false);

  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ebisen-tax');
      if (saved) setRecords(JSON.parse(saved) as TaxRecord[]);
    } catch {}

    if ('Notification' in window) {
      setNotifPerm(Notification.permission);
      if (Notification.permission === 'granted') fireNotifs();
    }
  }, []);

  function fireNotifs() {
    DEADLINES.forEach((dl) => {
      const d = daysLeft(dl.date);
      if (d >= 0 && d <= 7) {
        new Notification('EBISEN · Khai thuế', {
          body: `Còn ${d} ngày: ${dl.label} (hạn ${fmtDate(dl.date)})`,
        });
      }
    });
  }

  async function requestNotif() {
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') fireNotifs();
  }

  function persist(updated: TaxRecord[]) {
    setRecords(updated);
    localStorage.setItem('ebisen-tax', JSON.stringify(updated));
  }

  function saveRecord() {
    if (!fKy) { alert('Vui lòng chọn kỳ khai thuế.'); return; }
    const rec: TaxRecord = {
      ky: fKy,
      dt: parseFloat(fDt) || 0,
      khoan: parseFloat(fKhoan) || 0,
      status: fStatus,
      date: fDate,
      note: fNote,
      ts: Date.now(),
    };
    persist([rec, ...records]);
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 2500);
  }

  function clearForm() {
    setFKy(''); setFDt(''); setFKhoan('');
    setFStatus('pending'); setFDate(''); setFNote('');
  }

  function deleteRecord(i: number) {
    if (!confirm('Xóa kỳ khai báo này?')) return;
    persist(records.filter((_, idx) => idx !== i));
  }

  const dtNum = parseFloat(calcDt) || 0;
  const khoanNum = parseFloat(calcKhoan) || 0;
  const gtgt = dtNum * 0.03;
  const tncn = dtNum * 0.015;
  const total = dtNum * 0.045;
  const diff = dtNum && khoanNum ? khoanNum - total : null;

  const urgent = DEADLINES.map((dl) => ({ ...dl, days: daysLeft(dl.date) }))
    .filter((dl) => dl.days >= 0 && dl.days <= 14);

  const inputCls =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent';
  const labelCls = 'mb-1 block text-xs font-medium text-muted';

  return (
    <div className="max-w-3xl">
      {/* Alert banner */}
      {urgent.length > 0 && (
        <div className="mb-5 rounded-r-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm dark:bg-red-950/40">
          <span className="font-medium">Sắp đến hạn:</span>{' '}
          {urgent[0].label} — còn {urgent[0].days} ngày (hạn {fmtDate(urgent[0].date)}).
        </div>
      )}

      {/* Notification prompt */}
      {notifPerm === 'default' && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-medium">Bật thông báo trình duyệt</p>
            <p className="mt-0.5 text-xs text-muted">
              Tự động nhắc khi còn ≤ 7 ngày đến kỳ nộp thuế.
            </p>
          </div>
          <button
            onClick={requestNotif}
            className="shrink-0 rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Bật
          </button>
        </div>
      )}

      {/* Completed */}
      <section className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Đã hoàn thành
        </p>
        <div className="flex flex-wrap gap-2">
          {COMPLETED_KY.map((k) => (
            <div
              key={k.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <span className="text-sm" style={{ color: '#16a34a' }}>✓</span>
              <div>
                <p className="text-xs font-semibold leading-tight">{k.label}</p>
                <p className="text-[11px] text-muted">{k.sub} · {k.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Deadline cards */}
      <section className="mb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Kỳ khai thuế sắp tới
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DEADLINES.map((dl) => {
            const days = daysLeft(dl.date);
            const st = statusOf(days);
            const absD = Math.abs(days);
            const label =
              days < 0 ? 'ngày quá hạn' : days === 0 ? 'Hôm nay!' : 'ngày nữa';
            return (
              <div
                key={dl.id}
                className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface p-3"
                style={{ borderTopWidth: 3, borderTopColor: STATUS_BORDER[st] }}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted">{dl.type}</p>
                <p className="text-xs font-semibold leading-tight">{dl.label}</p>
                <p className="mb-1 text-[11px] text-muted">{dl.sub}</p>
                <p
                  className="text-2xl font-bold tabular-nums leading-none"
                  style={{ color: STATUS_TEXT[st] }}
                >
                  {days === 0 ? '0' : absD}
                </p>
                <p className="text-[10px] text-muted">{label}</p>
                <p className="mt-1 text-[10px] text-muted">Hạn: {fmtDate(dl.date)}</p>
                <a
                  href={calHref(dl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded border border-border px-2 py-0.5 text-[11px] text-accent hover:bg-accent/10"
                >
                  + Google Lịch
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Calculator + Form */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Calculator */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Ước tính thuế kỳ này
          </p>
          <Card>
            <div className="space-y-3 p-4">
              <div>
                <label className={labelCls}>Doanh thu thực tế kỳ (VND)</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="Vd: 125000000"
                  value={calcDt}
                  onChange={(e) => setCalcDt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 border-t border-border pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Thuế GTGT (3%)</span>
                  <span className="tabular-nums">{dtNum ? vnd(gtgt) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Thuế TNCN (1,5%)</span>
                  <span className="tabular-nums">{dtNum ? vnd(tncn) : '—'}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Tổng ước tính</span>
                  <span className="tabular-nums">{dtNum ? vnd(total) : '—'}</span>
                </div>
              </div>
              <div>
                <label className={labelCls}>Thuế khoán theo thông báo (VND)</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="Số trong thông báo thuế"
                  value={calcKhoan}
                  onChange={(e) => setCalcKhoan(e.target.value)}
                />
              </div>
              {diff !== null && (
                <div className="flex justify-between border-t border-border pt-2 text-sm">
                  <span className="text-muted">Chênh lệch</span>
                  <span
                    className="tabular-nums font-medium"
                    style={{
                      color:
                        diff > 5000 ? '#dc2626' : diff < -5000 ? '#16a34a' : undefined,
                    }}
                  >
                    {diff >= 0 ? '+' : ''}
                    {vnd(diff)}
                  </span>
                </div>
              )}
              <p className="rounded-lg border border-border bg-background p-2 text-[11px] leading-relaxed text-muted">
                Tỷ lệ áp dụng cho ngành sản xuất. Xác nhận với chi cục thuế.
              </p>
            </div>
          </Card>
        </div>

        {/* Form */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Ghi nhận kỳ khai báo
          </p>
          <Card>
            <div className="space-y-2.5 p-4">
              <div>
                <label className={labelCls}>
                  Kỳ khai thuế <span className="text-negative">*</span>
                </label>
                <select
                  className={inputCls}
                  value={fKy}
                  onChange={(e) => setFKy(e.target.value)}
                >
                  <option value="">— Chọn kỳ —</option>
                  {KY_OPTIONS.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Doanh thu thực tế kỳ (VND)</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="Tổng trong kỳ"
                  value={fDt}
                  onChange={(e) => setFDt(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Số thuế khoán phải nộp (VND)</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="Theo thông báo thuế"
                  value={fKhoan}
                  onChange={(e) => setFKhoan(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Trạng thái</label>
                <select
                  className={inputCls}
                  value={fStatus}
                  onChange={(e) => setFStatus(e.target.value as 'pending' | 'paid')}
                >
                  <option value="pending">Chưa nộp</option>
                  <option value="paid">Đã nộp</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Ngày nộp</label>
                <input
                  type="date"
                  className={inputCls}
                  value={fDate}
                  onChange={(e) => setFDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Ghi chú (số biên lai…)</label>
                <textarea
                  className={`${inputCls} min-h-[60px] resize-y`}
                  placeholder="Biên lai số..., chi cục thuế..."
                  value={fNote}
                  onChange={(e) => setFNote(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={saveRecord}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Lưu kỳ khai báo
                </button>
                <button
                  onClick={clearForm}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background"
                >
                  Xóa trắng
                </button>
                {saveOk && (
                  <span className="text-xs" style={{ color: '#16a34a' }}>
                    Đã lưu.
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* History */}
      <section className="mb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Lịch sử kê khai
        </p>
        <Card>
          {records.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Chưa có kỳ khai báo nào được lưu.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wide">Kỳ</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide">Doanh thu</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide">Thuế khoán</th>
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wide">Trạng thái</th>
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wide">Ngày nộp</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.ts} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium">{r.ky}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {r.dt ? vnd(r.dt) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {r.khoan ? vnd(r.khoan) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            r.status === 'paid'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'border border-border text-muted'
                          }`}
                        >
                          {r.status === 'paid' ? 'Đã nộp' : 'Chưa nộp'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted">
                        {r.date ? new Date(r.date).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => deleteRecord(i)}
                          className="rounded border border-border px-2 py-0.5 text-xs text-negative hover:bg-negative/10"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* eTax steps */}
      <section className="mb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Quy trình khai trên eTax
        </p>
        <Card>
          <div className="p-4">
            <ol className="space-y-3">
              {ETAX_STEPS.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                    {i + 1}
                  </div>
                  <div>
                    <span className="font-medium">{step.title}</span>
                    {' — '}
                    <span className="text-muted">{step.body}</span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-lg border border-border bg-background p-3 text-xs leading-relaxed text-muted">
              <strong className="text-foreground">Lưu ý:</strong> Deadline và số thuế
              khoán chính thức do Chi cục Thuế quản lý địa bàn quyết định. Liên hệ trực
              tiếp để xác nhận kỳ nộp đầu tiên sau khi đăng ký giấy phép.
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
