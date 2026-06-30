/* POST /api/auth/logout — Clear auth cookie */
import { NextResponse } from 'next/server';
import { getTokenName } from '@/lib/auth';

export async function POST() {
    const response = NextResponse.json({ success: true });
    response.cookies.delete(getTokenName());
    return response;
}
