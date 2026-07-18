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
      { href: '/revenue/detail', label: 'Bán hàng chi tiết', icon: '≣' },
    ],
  },
  {
    section: 'Chi phí',
    items: [
      { href: '/expenses', label: 'Chi phí theo tháng', icon: '↘' },
      { href: '/expenses/detail', label: 'Chi phí chi tiết', icon: '≣' },
    ],
  },
  {
    section: 'Lãi/Lỗ',
    items: [{ href: '/pnl', label: 'P&L', icon: '±' }],
  },
  {
    section: 'Tồn kho',
    items: [
      { href: '/inventory', label: 'Tồn kho tôm', icon: '🦐' },
      { href: '/materials', label: 'Tồn kho vật tư', icon: '📦' },
    ],
  },
  {
    section: 'Khách hàng',
    items: [{ href: '/customers', label: 'Khách hàng', icon: '☺' }],
  },
  {
    section: 'Nhập liệu',
    items: [
      { href: '/entry/sale', label: 'Nhập bán hàng', icon: '＋' },
      { href: '/entry/expense', label: 'Nhập chi phí', icon: '＋' },
      { href: '/entry/shrimp', label: 'Nhập tôm', icon: '＋' },
      { href: '/entry/gift', label: 'Nhập bánh tặng', icon: '＋' },
      { href: '/entry/material', label: 'Nhập túi/tem', icon: '＋' },
      { href: '/entry/customer', label: 'Nhập khách hàng', icon: '＋' },
    ],
  },
  {
    section: 'Cấu hình',
    items: [
      { href: '/menu', label: 'Thực đơn', icon: '☰' },
      { href: '/employees', label: 'Nhân viên', icon: '☺' },
      { href: '/share', label: 'Link nhập liệu', icon: '🔗' },
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
    // Ẩn P&L, Thực đơn, Nhân viên với staff (gate cứng ở server; đây chỉ là ẩn UI).
    items: group.items.filter(
      (item) =>
        !(
          ['/pnl', '/menu', '/employees', '/share'].includes(item.href) &&
          role !== 'owner'
        ),
    ),
  })).filter((g) => g.items.length > 0);

  // Href khớp cụ thể nhất với path hiện tại (tránh cả cha /expenses lẫn con
  // /expenses/detail cùng sáng). Chọn href dài nhất là tiền tố của pathname.
  const activeHref = nav
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <>
      {/* Topbar mobile */}
      <div className="md:hidden flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="EBISEN" className="h-7 w-7 rounded-lg object-contain" />
          <span className="font-semibold">EBISEN</span>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="EBISEN" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-semibold text-lg">EBISEN</span>
        </div>

        <nav className="px-3 pb-4 space-y-5">
          {nav.map((group) => (
            <div key={group.section}>
              <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.href === activeHref;
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
