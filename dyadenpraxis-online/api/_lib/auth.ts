import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.VITE_SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

export async function verifyJWT(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${process.env.VITE_SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });
    return payload as { sub: string };
  } catch {
    return null;
  }
}
