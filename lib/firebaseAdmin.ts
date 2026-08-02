import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | undefined;
let db: Firestore | undefined;

function readServiceAccount(): Record<string, string> | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json?.trim()) return null;
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return null;
  }
}

export function getAdminDb(): Firestore {
  if (db) return db;
  const sa = readServiceAccount();
  if (!sa) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is missing or invalid. See README email setup.",
    );
  }
  if (!getApps().length) {
    app = initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key?.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    app = getApps()[0]!;
  }
  db = getFirestore(app);
  return db;
}
