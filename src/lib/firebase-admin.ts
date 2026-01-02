import * as admin from 'firebase-admin';

// Lazy initialization - only initialize when actually needed
let initialized = false;
let initializationError: Error | null = null;

function initializeFirebaseAdmin(): void {
    if (initialized) {
        return;
    }
    
    if (admin.apps.length > 0) {
        initialized = true;
        return;
    }
    
    if (initializationError) {
        throw initializationError;
    }
    
    const startTime = Date.now();
    console.log('[Firebase Admin] Starting initialization...');
    
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'projectmarkethub-db904';
    
    console.log(`[Firebase Admin] projectId: ${projectId}, K_SERVICE: ${process.env.K_SERVICE || 'not set'}, GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT || 'not set'}`);

    try {
        // Cloud Run環境では、サービスアカウントキーなしで初期化
        // credentialを完全に省略し、デフォルトの認証情報検出に任せる
        // これにより、Cloud Run環境ではサービスアカウントが自動的に使用される
        console.log(`[Firebase Admin] [${Date.now() - startTime}ms] Calling initializeApp...`);
        
        admin.initializeApp({
            projectId: projectId,
        });
        
        console.log(`[Firebase Admin] [${Date.now() - startTime}ms] initializeApp completed`);
        initialized = true;
        console.log(`[Firebase Admin] [${Date.now() - startTime}ms] Initialized successfully`);
    } catch (error) {
        console.error(`[Firebase Admin] [${Date.now() - startTime}ms] Initialization error:`, error);
        initializationError = error as Error;
        throw error;
    }
}

// アプリ起動時に初期化を試みる（モジュールロード時）
// これにより、最初のAPIリクエスト時ではなく、コンテナ起動時に初期化される
try {
    console.log('[Firebase Admin] Attempting early initialization on module load...');
    initializeFirebaseAdmin();
    console.log('[Firebase Admin] Early initialization successful');
} catch (error) {
    console.error('[Firebase Admin] Early initialization failed, will retry on first use:', error);
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
        const auth = admin.auth();
        const value = (auth as any)[prop];
        // メソッドの場合はバインドして返す
        if (typeof value === 'function') {
            return value.bind(auth);
        }
        return value;
    }
});

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
    get(target, prop) {
        initializeFirebaseAdmin();
        const db = admin.firestore();
        const value = (db as any)[prop];
        // メソッドの場合はバインドして返す
        if (typeof value === 'function') {
            return value.bind(db);
        }
        return value;
    }
});

export const FieldValue = admin.firestore.FieldValue;
