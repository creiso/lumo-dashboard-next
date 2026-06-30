/* POST /api/auth/login — Validate password, set JWT cookie */
import { NextResponse } from 'next/server';
import { signToken, getTokenName, getCookieOptions } from '@/lib/auth';
import { checkPassword } from '@/lib/store';

export async function POST(request) {
    try {
        const { password } = await request.json();

        if (!password) {
            return NextResponse.json(
                { error: 'Senha obrigatória' },
                { status: 400 }
            );
        }

        if (!(await checkPassword(password))) {
            return NextResponse.json(
                { error: 'Senha incorreta' },
                { status: 401 }
            );
        }

        // Create JWT token
        const token = await signToken({ role: 'admin' });

        // Set httpOnly cookie
        const response = NextResponse.json({ success: true });
        response.cookies.set(getTokenName(), token, getCookieOptions());

        return response;
    } catch (e) {
        console.error('Login error:', e);
        return NextResponse.json(
            { error: 'Erro interno' },
            { status: 500 }
        );
    }
}
