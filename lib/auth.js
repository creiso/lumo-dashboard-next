/* ============================================================
   AUTH - JWT helpers using jose (Edge-compatible)
   ============================================================ */
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-change-me'
);

const TOKEN_NAME = 'lumo_auth_token';
const TOKEN_MAX_AGE = 60 * 60 * 8; // 8 hours

/**
 * Sign a JWT token
 */
export async function signToken(payload = {}) {
    return await new SignJWT({ ...payload, role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${TOKEN_MAX_AGE}s`)
        .sign(JWT_SECRET);
}

/**
 * Verify a JWT token
 * @returns {object|null} payload if valid, null if invalid
 */
export async function verifyToken(token) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch (e) {
        return null;
    }
}

/**
 * Get token cookie name
 */
export function getTokenName() {
    return TOKEN_NAME;
}

/**
 * Get cookie options for the auth token
 */
export function getCookieOptions(maxAge = TOKEN_MAX_AGE) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge
    };
}

/**
 * Validate the admin password
 */
export function validatePassword(password) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'lumo2024';
    return password === adminPassword;
}
