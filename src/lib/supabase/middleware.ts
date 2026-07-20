// Refresh session Supabase trên mỗi request và chặn truy cập khi chưa đăng nhập.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

// Đường dẫn công khai, không cần đăng nhập.
// /nhap       = link nhập bán hàng công khai (gated bằng token trong URL, xem 0005).
// /xem        = link XEM bán hàng chi tiết công khai, chỉ đọc (token, xem 0008).
// /nhap-khach = link nhập THÔNG TIN KHÁCH công khai (token, xem public_customer_form).
// /tram       = link XEM doanh thu + bán hàng chi tiết dành cho trạm (token).
// /api/cron   = Vercel Cron (tự xác thực bằng CRON_SECRET trong route).
const PUBLIC_PATHS = ['/login', '/auth', '/nhap', '/xem', '/nhap-khach', '/tram', '/api/cron'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // QUAN TRỌNG: getUser() phải được gọi để refresh token. Đừng bỏ.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
