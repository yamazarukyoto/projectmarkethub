import * as admin from 'firebase-admin';

// シンプルな初期化 - モジュールロード時に一度だけ実行
let app: admin.app.App | null = null;

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
        // Cloud Run環境では認証情報は自動的に提供される
        // credentialを省略してデフォルトの認証情報検出に任せる
        app = admin.initializeApp({
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
    return getApp().firestore();
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
