/* ============================================================
   MIDDLEWARE - Protect /admin.html with JWT auth
   Runs at the Edge before any request is processed
   ============================================================ */
import { NextResponse } from 'next/server';
import { verifyToken, getTokenName } from './lib/auth';

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    // Only protect admin page
    if (pathname === '/admin.html') {
        const token = request.cookies.get(getTokenName())?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/login.html', request.url));
        }

        const payload = await verifyToken(token);
        if (!payload || payload.role !== 'admin') {
            // Invalid or expired token
            const response = NextResponse.redirect(new URL('/login.html', request.url));
            response.cookies.delete(getTokenName());
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin.html']
};
