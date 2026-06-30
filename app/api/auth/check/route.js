/* GET /api/auth/check — Verify auth status */
import { NextResponse } from 'next/server';
import { verifyToken, getTokenName } from '@/lib/auth';

export async function GET(request) {
    const token = request.cookies.get(getTokenName())?.value;

    if (!token) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, role: payload.role });
}
