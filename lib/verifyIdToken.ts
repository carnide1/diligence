/**
 * Verify a Firebase ID token via the Identity Toolkit REST API
 * (no Admin SDK required for this client-first app).
 */
export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<{ uid: string } | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey || !idToken.trim()) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      users?: Array<{ localId?: string }>;
    };
    const uid = data.users?.[0]?.localId;
    return uid ? { uid } : null;
  } catch {
    return null;
  }
}

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}
