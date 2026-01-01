import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

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

const sendEmail = async (to: string, subject: string, text: string) => {
  if (!to) return;
  
  const mailOptions = {
    from: '"Project Market Hub" <no-reply@project-market-hub.com>',
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Helper to get user settings
const getUser = async (uid: string) => {
  const doc = await db.collection("users").doc(uid).get();
  return doc.exists ? doc.data() : null;
};

// 1. 募集期限切れチェック (Daily)
export const checkExpiredJobs = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
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
export const autoCompleteContracts = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
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
      if (worker && worker.email && worker.notificationSettings?.emailContract !== false) {
        await sendEmail(
          worker.email,
          "【Project Market Hub】自動検収のお知らせ",
          `${contract.jobTitle} の検収が自動的に完了しました。報酬が支払われます。`
        );
      }
    } catch (error) {
      console.error(`Failed to auto-complete contract ${doc.id}:`, error);
    }
  }
  return null;
});

// 3. 未読メッセージ通知 (Every 15 mins)
export const sendUnreadMessageNotifications = functions.pubsub.schedule("every 15 minutes").onRun(async (context) => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  // Get messages that haven't been emailed yet
  const messagesRef = db.collectionGroup("messages");
  const snapshot = await messagesRef
    .where("emailSent", "==", false)
    .get();

  if (snapshot.empty) return null;

  const userMessages = new Map<string, any[]>();
  const processedDocs: admin.firestore.DocumentReference[] = [];

  for (const doc of snapshot.docs) {
    const msg = doc.data();
    // Skip if too new (give 5 mins to read)
    if (msg.createdAt.toDate() > fiveMinutesAgo) continue;

    processedDocs.push(doc.ref);

    // Find recipient
    const roomRef = doc.ref.parent.parent;
    if (!roomRef) continue;

    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) continue;
    
    const room = roomSnap.data();
    if (!room || !room.participants) continue;

    const participants = Object.keys(room.participants);
    const recipientId = participants.find(uid => uid !== msg.senderId);

    if (!recipientId) continue;

    // Check if already read
    if (msg.readBy && msg.readBy.includes(recipientId)) continue;

    // Add to map
    if (!userMessages.has(recipientId)) {
      userMessages.set(recipientId, []);
    }
    userMessages.get(recipientId)?.push(msg);
  }

  // Send emails
  for (const [userId, msgs] of userMessages) {
    const user = await getUser(userId);
    if (user && user.email && user.notificationSettings?.emailMessage !== false) {
      await sendEmail(
        user.email,
        "【Project Market Hub】新着メッセージがあります",
        `あなたは ${msgs.length} 件の未読メッセージを受け取っています。\n\nサイトにログインして確認してください。\nhttps://project-market-hub.com/messages`
      );
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
export const onContractUpdate = functions.firestore
  .document("contracts/{contractId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    
    if (newData.status === oldData.status) return null;

    const contractId = context.params.contractId;
    const client = await getUser(newData.clientId);
    const worker = await getUser(newData.workerId);

    // 2. Worker Agreed (pending_signature -> waiting_for_escrow)
    if (newData.status === "waiting_for_escrow") {
      if (client && client.email && client.notificationSettings?.emailContract !== false) {
        await sendEmail(
          client.email,
          "【Project Market Hub】契約が合意されました",
          `${worker?.displayName || "ワーカー"} が案件「${newData.jobTitle}」の契約に合意しました。\n仮決済を行ってください。\n\nhttps://project-market-hub.com/client/contracts/${contractId}`
        );
      }
    }

    // 3. Payment Complete (waiting_for_escrow -> escrow)
    if (newData.status === "escrow") {
      if (worker && worker.email && worker.notificationSettings?.emailContract !== false) {
        await sendEmail(
          worker.email,
          "【Project Market Hub】仮決済が完了しました",
          `案件「${newData.jobTitle}」の仮決済が完了しました。\n業務を開始してください。\n\nhttps://project-market-hub.com/worker/contracts/${contractId}`
        );
      }
    }

    // 4. Submitted (escrow/in_progress -> submitted)
    if (newData.status === "submitted") {
      if (client && client.email && client.notificationSettings?.emailContract !== false) {
        await sendEmail(
          client.email,
          "【Project Market Hub】納品報告がありました",
          `${worker?.displayName || "ワーカー"} から案件「${newData.jobTitle}」の納品報告がありました。\n内容を確認し、検収を行ってください。\n\nhttps://project-market-hub.com/client/contracts/${contractId}`
        );
      }
    }

    // 5. Completed (submitted -> completed)
    if (newData.status === "completed") {
      if (worker && worker.email && worker.notificationSettings?.emailContract !== false) {
        await sendEmail(
          worker.email,
          "【Project Market Hub】検収が完了しました",
          `案件「${newData.jobTitle}」の検収が完了しました。\n報酬が支払われます。\n\nhttps://project-market-hub.com/worker/contracts/${contractId}`
        );
      }
    }

    return null;
  });

export const onContractCreate = functions.firestore
  .document("contracts/{contractId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    // Usually created with pending_signature
    if (data.status === "pending_signature") {
      const worker = await getUser(data.workerId);
      const client = await getUser(data.clientId);
      
      if (worker && worker.email && worker.notificationSettings?.emailContract !== false) {
        await sendEmail(
          worker.email,
          "【Project Market Hub】契約オファーが届きました",
          `${client?.displayName || "クライアント"} から案件「${data.jobTitle}」の契約オファーが届きました。\n内容を確認し、合意してください。\n\nhttps://project-market-hub.com/worker/contracts/${context.params.contractId}`
        );
      }
    }
    return null;
  });

// 5. 完了プロジェクトの自動削除 (Daily)
// 完了またはキャンセルから3か月経過した契約を削除
export const deleteOldCompletedContracts = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
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
    } catch (error) {
      console.error(`Failed to delete contract ${doc.id}:`, error);
    }
  }
  
  console.log(`Deleted ${allDocs.length} old contracts.`);
  return null;
});

// 6. 削除予定通知 (Daily)
// 削除2週間前と1週間前に通知
export const notifyUpcomingDeletion = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
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
    if (contract.deletionNotified2Weeks) continue;

    const client = await getUser(contract.clientId);
    const worker = await getUser(contract.workerId);

    // クライアントに通知
    if (client && client.email) {
      await sendEmail(
        client.email,
        "【Project Market Hub】契約データ削除のお知らせ（2週間前）",
        `案件「${contract.jobTitle}」の契約データは、完了から3か月後に自動削除されます。\n\n削除予定日: 約2週間後\n\n必要なデータ（納品物、メッセージ等）は、削除前にダウンロードして保存してください。\n\nhttps://project-market-hub.com/client/contracts/${doc.id}`
      );
    }

    // ワーカーに通知
    if (worker && worker.email) {
      await sendEmail(
        worker.email,
        "【Project Market Hub】契約データ削除のお知らせ（2週間前）",
        `案件「${contract.jobTitle}」の契約データは、完了から3か月後に自動削除されます。\n\n削除予定日: 約2週間後\n\n必要なデータ（納品物、メッセージ等）は、削除前にダウンロードして保存してください。\n\nhttps://project-market-hub.com/worker/contracts/${doc.id}`
      );
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
    if (contract.deletionNotified1Week) continue;

    const client = await getUser(contract.clientId);
    const worker = await getUser(contract.workerId);

    // クライアントに通知
    if (client && client.email) {
      await sendEmail(
        client.email,
        "【Project Market Hub】契約データ削除のお知らせ（1週間前）",
        `【重要】案件「${contract.jobTitle}」の契約データは、まもなく自動削除されます。\n\n削除予定日: 約1週間後\n\n必要なデータ（納品物、メッセージ等）は、今すぐダウンロードして保存してください。\n\nhttps://project-market-hub.com/client/contracts/${doc.id}`
      );
    }

    // ワーカーに通知
    if (worker && worker.email) {
      await sendEmail(
        worker.email,
        "【Project Market Hub】契約データ削除のお知らせ（1週間前）",
        `【重要】案件「${contract.jobTitle}」の契約データは、まもなく自動削除されます。\n\n削除予定日: 約1週間後\n\n必要なデータ（納品物、メッセージ等）は、今すぐダウンロードして保存してください。\n\nhttps://project-market-hub.com/worker/contracts/${doc.id}`
      );
    }

    // 通知済みフラグを設定
    await doc.ref.update({ deletionNotified1Week: true });
  }

  console.log(`Sent deletion notifications: 2 weeks=${twoWeeksSnapshot.size}, 1 week=${oneWeekSnapshot.size}`);
  return null;
});
