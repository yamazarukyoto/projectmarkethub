import * as admin from 'firebase-admin';

// Lazy initialization - only initialize when actually needed
let initialized = false;

function initializeFirebaseAdmin(): void {
    if (initialized || admin.apps.length > 0) {
        return;
    }
    
    console.log('[Firebase Admin] Starting initialization...');
    
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'projectmarkethub-db904';
    
    console.log(`[Firebase Admin] projectId: ${projectId}, K_SERVICE: ${process.env.K_SERVICE || 'not set'}`);

    try {
        // Cloud Run環境では、サービスアカウントキーなしで初期化
        // applicationDefault()は内部でメタデータサーバーにアクセスするため、
        // 代わりにcredentialを省略してデフォルトの動作に任せる
        admin.initializeApp({
            projectId: projectId,
        });
        initialized = true;
        console.log('[Firebase Admin] Initialized successfully');
    } catch (error) {
        console.error('[Firebase Admin] Initialization error:', error);
        throw error;
    }
}

// Getter functions that ensure initialization before use
export const getAdminAuth = () => {
    initializeFirebaseAdmin();
    return admin.auth();
};

export const getAdminDb = () => {
    initializeFirebaseAdmin();
    return admin.firestore();
};

// For backward compatibility - these will trigger initialization on first access
export const adminAuth = new Proxy({} as admin.auth.Auth, {
    get(target, prop) {
        initializeFirebaseAdmin();
        return (admin.auth() as any)[prop];
    }
});

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
    get(target, prop) {
        initializeFirebaseAdmin();
        return (admin.firestore() as any)[prop];
    }
});

export const FieldValue = admin.firestore.FieldValue;
