"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUpcomingDeletion = exports.deleteOldCompletedContracts = exports.onContractCreate = exports.onContractUpdate = exports.sendUnreadMessageNotifications = exports.autoCompleteContracts = exports.checkExpiredJobs = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
admin.initializeApp();
const db = admin.firestore();
// Configure Nodemailer
// Note: For Gmail, you need to use App Password if 2FA is on.
// Recommended to use SendGrid or other transactional email services for production.
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "kenta.yamamoto.mobile@gmail.com",
        pass: "aaaaaa", // Note: This likely requires an App Password if 2FA is enabled
    },
});
const sendEmail = async (to, subject, text) => {
    if (!to)
        return;
    const mailOptions = {
        from: '"Project Market Hub" <no-reply@project-market-hub.com>',
        to,
        subject,
        text,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    }
    catch (error) {
        console.error("Error sending email:", error);
    }
};
// Helper to get user settings
const getUser = async (uid) => {
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? doc.data() : null;
};
// 1. 募集期限切れチェック (Daily)
exports.checkExpiredJobs = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const jobsRef = db.collection("jobs");
    const snapshot = await jobsRef
        .where("status", "==", "open")
        .where("deadline", "<", now)
        .get();
    if (snapshot.empty) {
        console.log("No expired jobs found.");
        return null;
    }
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { status: "closed" });
    });
    await batch.commit();
    console.log(`Closed ${snapshot.size} expired jobs.`);
    return null;
});
// 2. 自動検収処理 (Daily)
exports.autoCompleteContracts = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
    var _a;
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgoTimestamp = admin.firestore.Timestamp.fromDate(fourteenDaysAgo);
    const contractsRef = db.collection("contracts");
    const snapshot = await contractsRef
        .where("status", "==", "submitted")
        .where("submittedAt", "<", fourteenDaysAgoTimestamp)
        .get();
    if (snapshot.empty) {
        console.log("No contracts to auto-complete.");
        return null;
    }
    for (const doc of snapshot.docs) {
        const contract = doc.data();
        try {
            await doc.ref.update({
                status: "completed",
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                autoCompleted: true,
            });
            console.log(`Auto-completed contract ${doc.id}`);
            // Notify Worker
            const worker = await getUser(contract.workerId);
            if (worker && worker.email && ((_a = worker.notificationSettings) === null || _a === void 0 ? void 0 : _a.emailContract) !== false) {
                await sendEmail(worker.email, "【Project Market Hub】自動検収のお知らせ", `${contract.jobTitle} の検収が自動的に完了しました。報酬が支払われます。`);
            }
        }
        catch (error) {
            console.error(`Failed to auto-complete contract ${doc.id}:`, error);
        }
    }
    return null;
});
// 3. 未読メッセージ通知 (Every 15 mins)
exports.sendUnreadMessageNotifications = functions.pubsub.schedule("every 15 minutes").onRun(async (context) => {
    var _a, _b;
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    // Get messages that haven't been emailed yet
    const messagesRef = db.collectionGroup("messages");
    const snapshot = await messagesRef
        .where("emailSent", "==", false)
        .get();
    if (snapshot.empty)
        return null;
    const userMessages = new Map();
    const processedDocs = [];
    for (const doc of snapshot.docs) {
        const msg = doc.data();
        // Skip if too new (give 5 mins to read)
        if (msg.createdAt.toDate() > fiveMinutesAgo)
            continue;
        processedDocs.push(doc.ref);
        // Find recipient
        const roomRef = doc.ref.parent.parent;
        if (!roomRef)
            continue;
        const roomSnap = await roomRef.get();
        if (!roomSnap.exists)
            continue;
        const room = roomSnap.data();
        if (!room || !room.participants)
            continue;
        const participants = Object.keys(room.participants);
        const recipientId = participants.find(uid => uid !== msg.senderId);
        if (!recipientId)
            continue;
        // Check if already read
        if (msg.readBy && msg.readBy.includes(recipientId))
            continue;
        // Add to map
        if (!userMessages.has(recipientId)) {
            userMessages.set(recipientId, []);
        }
        (_a = userMessages.get(recipientId)) === null || _a === void 0 ? void 0 : _a.push(msg);
    }
    // Send emails
    for (const [userId, msgs] of userMessages) {
        const user = await getUser(userId);
        if (user && user.email && ((_b = user.notificationSettings) === null || _b === void 0 ? void 0 : _b.emailMessage) !== false) {
            await sendEmail(user.email, "【Project Market Hub】新着メッセージがあります", `あなたは ${msgs.length} 件の未読メッセージを受け取っています。\n\nサイトにログインして確認してください。\nhttps://project-market-hub.com/messages`);
        }
    }
    // Mark as sent
    const batch = db.batch();
    // Batch limit is 500. If more, we should chunk. For now assuming < 500.
    processedDocs.forEach(ref => {
        batch.update(ref, { emailSent: true });
    });
    if (processedDocs.length > 0) {
        await batch.commit();
    }
    return null;
});
// 4. 契約ステータス変更通知
exports.onContractUpdate = functions.firestore
    .document("contracts/{contractId}")
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d;
    const newData = change.after.data();
    const oldData = change.before.data();
    if (newData.status === oldData.status)
        return null;
    const contractId = context.params.contractId;
    const client = await getUser(newData.clientId);
    const worker = await getUser(newData.workerId);
    // 2. Worker Agreed (pending_signature -> waiting_for_escrow)
    if (newData.status === "waiting_for_escrow") {
        if (client && client.email && ((_a = client.notificationSettings) === null || _a === void 0 ? void 0 : _a.emailContract) !== false) {
            await sendEmail(client.email, "【Project Market Hub】契約が合意されました", `${(worker === null || worker === void 0 ? void 0 : worker.displayName) || "ワーカー"} が案件「${newData.jobTitle}」の契約に合意しました。\n仮決済を行ってください。\n\nhttps://project-market-hub.com/client/contracts/${contractId}`);
        }
    }
    // 3. Payment Complete (waiting_for_escrow -> escrow)
    if (newData.status === "escrow") {
        if (worker && worker.email && ((_b = worker.notificationSettings) === null || _b === void 0 ? void 0 : _b.emailContract) !== false) {
            await sendEmail(worker.email, "【Project Market Hub】仮決済が完了しました", `案件「${newData.jobTitle}」の仮決済が完了しました。\n業務を開始してください。\n\nhttps://project-market-hub.com/worker/contracts/${contractId}`);
        }
    }
    // 4. Submitted (escrow/in_progress -> submitted)
    if (newData.status === "submitted") {
        if (client && client.email && ((_c = client.notificationSettings) === null || _c === void 0 ? void 0 : _c.emailContract) !== false) {
            await sendEmail(client.email, "【Project Market Hub】納品報告がありました", `${(worker === null || worker === void 0 ? void 0 : worker.displayName) || "ワーカー"} から案件「${newData.jobTitle}」の納品報告がありました。\n内容を確認し、検収を行ってください。\n\nhttps://project-market-hub.com/client/contracts/${contractId}`);
        }
    }
    // 5. Completed (submitted -> completed)
    if (newData.status === "completed") {
        if (worker && worker.email && ((_d = worker.notificationSettings) === null || _d === void 0 ? void 0 : _d.emailContract) !== false) {
            await sendEmail(worker.email, "【Project Market Hub】検収が完了しました", `案件「${newData.jobTitle}」の検収が完了しました。\n報酬が支払われます。\n\nhttps://project-market-hub.com/worker/contracts/${contractId}`);
        }
    }
    return null;
});
exports.onContractCreate = functions.firestore
    .document("contracts/{contractId}")
    .onCreate(async (snap, context) => {
    var _a;
    const data = snap.data();
    // Usually created with pending_signature
    if (data.status === "pending_signature") {
        const worker = await getUser(data.workerId);
        const client = await getUser(data.clientId);
        if (worker && worker.email && ((_a = worker.notificationSettings) === null || _a === void 0 ? void 0 : _a.emailContract) !== false) {
            await sendEmail(worker.email, "【Project Market Hub】契約オファーが届きました", `${(client === null || client === void 0 ? void 0 : client.displayName) || "クライアント"} から案件「${data.jobTitle}」の契約オファーが届きました。\n内容を確認し、合意してください。\n\nhttps://project-market-hub.com/worker/contracts/${context.params.contractId}`);
        }
    }
    return null;
});
// 5. 完了プロジェクトの自動削除 (Daily)
// 完了またはキャンセルから3か月経過した契約を削除
exports.deleteOldCompletedContracts = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const threeMonthsAgoTimestamp = admin.firestore.Timestamp.fromDate(threeMonthsAgo);
    const contractsRef = db.collection("contracts");
    // completedの契約
    const completedSnapshot = await contractsRef
        .where("status", "==", "completed")
        .where("completedAt", "<", threeMonthsAgoTimestamp)
        .get();
    // cancelledの契約
    const cancelledSnapshot = await contractsRef
        .where("status", "==", "cancelled")
        .where("updatedAt", "<", threeMonthsAgoTimestamp)
        .get();
    const allDocs = [...completedSnapshot.docs, ...cancelledSnapshot.docs];
    if (allDocs.length === 0) {
        console.log("No old contracts to delete.");
        return null;
    }
    for (const doc of allDocs) {
        try {
            await doc.ref.delete();
            console.log(`Deleted old contract ${doc.id}`);
        }
        catch (error) {
            console.error(`Failed to delete contract ${doc.id}:`, error);
        }
    }
    console.log(`Deleted ${allDocs.length} old contracts.`);
    return null;
});
// 6. 削除予定通知 (Daily)
// 削除2週間前と1週間前に通知
exports.notifyUpcomingDeletion = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
    const now = new Date();
    // 2週間後に削除予定（76日前に完了した契約）
    const twoWeeksBeforeDeletion = new Date(now.getTime() - 76 * 24 * 60 * 60 * 1000);
    const twoWeeksBeforeStart = new Date(twoWeeksBeforeDeletion.getTime() - 24 * 60 * 60 * 1000);
    // 1週間後に削除予定（83日前に完了した契約）
    const oneWeekBeforeDeletion = new Date(now.getTime() - 83 * 24 * 60 * 60 * 1000);
    const oneWeekBeforeStart = new Date(oneWeekBeforeDeletion.getTime() - 24 * 60 * 60 * 1000);
    const contractsRef = db.collection("contracts");
    // 2週間前通知
    const twoWeeksSnapshot = await contractsRef
        .where("status", "==", "completed")
        .where("completedAt", ">=", admin.firestore.Timestamp.fromDate(twoWeeksBeforeStart))
        .where("completedAt", "<", admin.firestore.Timestamp.fromDate(twoWeeksBeforeDeletion))
        .get();
    for (const doc of twoWeeksSnapshot.docs) {
        const contract = doc.data();
        // 既に通知済みかチェック
        if (contract.deletionNotified2Weeks)
            continue;
        const client = await getUser(contract.clientId);
        const worker = await getUser(contract.workerId);
        // クライアントに通知
        if (client && client.email) {
            await sendEmail(client.email, "【Project Market Hub】契約データ削除のお知らせ（2週間前）", `案件「${contract.jobTitle}」の契約データは、完了から3か月後に自動削除されます。\n\n削除予定日: 約2週間後\n\n必要なデータ（納品物、メッセージ等）は、削除前にダウンロードして保存してください。\n\nhttps://project-market-hub.com/client/contracts/${doc.id}`);
        }
        // ワーカーに通知
        if (worker && worker.email) {
            await sendEmail(worker.email, "【Project Market Hub】契約データ削除のお知らせ（2週間前）", `案件「${contract.jobTitle}」の契約データは、完了から3か月後に自動削除されます。\n\n削除予定日: 約2週間後\n\n必要なデータ（納品物、メッセージ等）は、削除前にダウンロードして保存してください。\n\nhttps://project-market-hub.com/worker/contracts/${doc.id}`);
        }
        // 通知済みフラグを設定
        await doc.ref.update({ deletionNotified2Weeks: true });
    }
    // 1週間前通知
    const oneWeekSnapshot = await contractsRef
        .where("status", "==", "completed")
        .where("completedAt", ">=", admin.firestore.Timestamp.fromDate(oneWeekBeforeStart))
        .where("completedAt", "<", admin.firestore.Timestamp.fromDate(oneWeekBeforeDeletion))
        .get();
    for (const doc of oneWeekSnapshot.docs) {
        const contract = doc.data();
        // 既に通知済みかチェック
        if (contract.deletionNotified1Week)
            continue;
        const client = await getUser(contract.clientId);
        const worker = await getUser(contract.workerId);
        // クライアントに通知
        if (client && client.email) {
            await sendEmail(client.email, "【Project Market Hub】契約データ削除のお知らせ（1週間前）", `【重要】案件「${contract.jobTitle}」の契約データは、まもなく自動削除されます。\n\n削除予定日: 約1週間後\n\n必要なデータ（納品物、メッセージ等）は、今すぐダウンロードして保存してください。\n\nhttps://project-market-hub.com/client/contracts/${doc.id}`);
        }
        // ワーカーに通知
        if (worker && worker.email) {
            await sendEmail(worker.email, "【Project Market Hub】契約データ削除のお知らせ（1週間前）", `【重要】案件「${contract.jobTitle}」の契約データは、まもなく自動削除されます。\n\n削除予定日: 約1週間後\n\n必要なデータ（納品物、メッセージ等）は、今すぐダウンロードして保存してください。\n\nhttps://project-market-hub.com/worker/contracts/${doc.id}`);
        }
        // 通知済みフラグを設定
        await doc.ref.update({ deletionNotified1Week: true });
    }
    console.log(`Sent deletion notifications: 2 weeks=${twoWeeksSnapshot.size}, 1 week=${oneWeekSnapshot.size}`);
    return null;
});
//# sourceMappingURL=index.js.map