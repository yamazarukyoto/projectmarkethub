import * as admin from 'firebase-admin';

// シンプルな初期化 - モジュールロード時に一度だけ実行
let app: admin.app.App | null = null;
let firestoreInstance: admin.firestore.Firestore | null = null;

function getApp(): admin.app.App {
    if (app) {
        return app;
    }
    
    if (admin.apps.length > 0) {
        app = admin.apps[0]!;
        return app;
    }
    
    const projectId = process.env.FIREBASE_PROJECT_ID || 
                      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
                      'projectmarkethub-db904';
    
    console.log(`[Firebase Admin] Initializing with projectId: ${projectId}`);
    
    try {
        // Cloud Run環境では applicationDefault() を明示的に使用
        app = admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: projectId,
        });
        console.log('[Firebase Admin] Initialized successfully');
        return app;
    } catch (error) {
        console.error('[Firebase Admin] Initialization error:', error);
        throw error;
    }
}

// 直接エクスポート - Proxyを使わずシンプルに
export function getAdminAuth(): admin.auth.Auth {
    return getApp().auth();
}

export function getAdminDb(): admin.firestore.Firestore {
    if (firestoreInstance) {
        return firestoreInstance;
    }
    
    const db = getApp().firestore();
    
    // Cloud Run環境でgRPCがハングする問題を回避するため、設定を調整
    // preferRest: true を使用してREST APIを優先
    try {
        db.settings({
            preferRest: true,  // gRPCの代わりにREST APIを使用
            ignoreUndefinedProperties: true,
        });
        console.log('[Firebase Admin] Firestore settings applied (preferRest: true)');
    } catch (e) {
        // 既に設定済みの場合はエラーを無視
        console.log('[Firebase Admin] Firestore settings already applied');
    }
    
    firestoreInstance = db;
    return firestoreInstance;
}

// 後方互換性のためのエクスポート
// 注意: これらはgetter関数を呼び出すため、使用時に初期化される
export const adminAuth = {
    verifyIdToken: (token: string) => getAdminAuth().verifyIdToken(token),
    getUser: (uid: string) => getAdminAuth().getUser(uid),
    createUser: (properties: admin.auth.CreateRequest) => getAdminAuth().createUser(properties),
    updateUser: (uid: string, properties: admin.auth.UpdateRequest) => getAdminAuth().updateUser(uid, properties),
    deleteUser: (uid: string) => getAdminAuth().deleteUser(uid),
};

export const adminDb = {
    collection: (path: string) => getAdminDb().collection(path),
    doc: (path: string) => getAdminDb().doc(path),
    batch: () => getAdminDb().batch(),
    runTransaction: <T>(updateFunction: (transaction: admin.firestore.Transaction) => Promise<T>) => 
        getAdminDb().runTransaction(updateFunction),
};

export const FieldValue = admin.firestore.FieldValue;
