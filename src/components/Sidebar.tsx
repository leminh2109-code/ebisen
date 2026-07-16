'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type NavItem = { href: string; label: string; icon: string };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Tổng quan',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: '▚' }],
  },
  {
    section: 'Doanh thu',
    items: [
      { href: '/revenue/monthly', label: 'Doanh thu tháng', icon: '↗' },
      { href: '/revenue/detail', label: 'Doanh thu chi tiết', icon: '≣' },
    ],
  },
  {
    section: 'Chi phí',
    items: [{ href: '/expenses', label: 'Chi phí theo tháng', icon: '↘' }],
  },
  {
    section: 'Lãi/Lỗ',
    items: [{ href: '/pnl', label: 'P&L', icon: '±' }],
  },
  {
    section: 'Nhập liệu',
    items: [
      { href: '/entry/invoice', label: 'Nhập hóa đơn', icon: '＋' },
      { href: '/entry/expense', label: 'Nhập chi phí', icon: '＋' },
    ],
  },
];

export default function Sidebar({
  email,
  role,
}: {
  email: string;
  role: 'owner' | 'staff' | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = NAV.map((group) => ({
    ...group,
    // Ẩn nhóm P&L với staff (gate cứng ở server; đây chỉ là ẩn UI).
    items: group.items.filter(
      (item) => !(item.href === '/pnl' && role !== 'owner'),
    ),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Topbar mobile */}
      <div className="md:hidden flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-fg text-sm font-bold">
            e
          </span>
          <span className="font-semibold">ebisen</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-border px-3 py-1 text-sm"
          aria-label="Menu"
        >
          ☰
        </button>
      </div>

      <aside
        className={`${
          open ? 'block' : 'hidden'
        } md:block md:w-64 md:shrink-0 border-r border-border bg-surface`}
      >
        <div className="hidden md:flex items-center gap-2 px-5 py-5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg font-bold">
            e
          </span>
          <span className="font-semibold text-lg">ebisen</span>
        </div>

        <nav className="px-3 pb-4 space-y-5">
          {nav.map((group) => (
            <div key={group.section}>
              <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                          active
                            ? 'bg-accent/10 text-accent font-medium'
                            : 'text-foreground/80 hover:bg-background'
                        }`}
                      >
                        <span className="w-4 text-center text-muted">
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border px-4 py-4">
          <p className="text-xs text-muted truncate">{email}</p>
          <p className="text-xs text-muted mb-2">
            {role === 'owner' ? 'Chủ doanh nghiệp' : 'Nhân viên'}
          </p>
          <form action="/auth/signout" method="post">
            <button className="w-full rounded-lg border border-border px-3 py-1.5 text-sm text-foreground/80 hover:bg-background">
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
