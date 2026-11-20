import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigFromFile from '../../firebase-applet-config.json';

const envApiKey = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env?.VITE_FIREBASE_API_KEY;
const resolvedApiKey = (envApiKey && envApiKey.trim()) || (firebaseConfigFromFile as { apiKey?: string }).apiKey || '';
const firebaseConfig = { ...firebaseConfigFromFile, apiKey: resolvedApiKey };

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Export Authentication and Firestore references
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId); /* CRITICAL: The app will break without this line */

let authInstance: Auth;
try {
  authInstance = resolvedApiKey ? getAuth(app) : ({ currentUser: null } as unknown as Auth);
} catch (err) {
  console.warn('Firebase Auth initialization skipped:', err);
  authInstance = { currentUser: null } as unknown as Auth;
}
export const auth = authInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Handles Firestore errors by wrapping them into a descriptive JSON string structure.
 * This is crucial for security rule diagnostics and debugging.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to the Firestore backend.
 */
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client appears to be offline.");
    }
  }
}

// Perform initial connection check
testConnection();
