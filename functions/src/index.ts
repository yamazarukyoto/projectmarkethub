import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

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
    // TODO: Refund logic if needed (for competition/task)
    // TODO: Send email notification to client
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

  // Note: Batch limit is 500. If more, need to chunk.
  // For simplicity, assuming < 500 or just processing first batch.
  // Also, we need to execute payment transfer here, which is async and not suitable for batch.
  // So we process one by one.

  for (const doc of snapshot.docs) {
    const contract = doc.data();
    try {
      // Execute Transfer (using Stripe)
      // Since we are in functions, we can use stripe-node directly if configured.
      // Or call the API endpoint (but functions calling own API is weird).
      // Better to use shared library logic.
      // For now, just update status to completed as a placeholder for auto-complete logic.
      // In real implementation, we should call Stripe Transfer here.
      
      await doc.ref.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        autoCompleted: true,
      });
      console.log(`Auto-completed contract ${doc.id}`);
      
      // TODO: Send email notification
    } catch (error) {
      console.error(`Failed to auto-complete contract ${doc.id}:`, error);
    }
  }
  return null;
});

// 3. 未読メッセージ通知 (Every 15 mins)
export const sendUnreadMessageNotifications = functions.pubsub.schedule("every 15 minutes").onRun(async (context) => {
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const fifteenMinutesAgoTimestamp = admin.firestore.Timestamp.fromDate(fifteenMinutesAgo);

  // This query is complex because messages are in subcollections.
  // Collection Group Query is needed.
  const messagesRef = db.collectionGroup("messages");
  const snapshot = await messagesRef
    .where("createdAt", ">", fifteenMinutesAgoTimestamp) // Recent messages
    // We can't easily filter by "unread and not notified" efficiently without a specific flag.
    // Assuming we have a 'notified' flag or similar.
    // Or we check all recent messages and see if they are read.
    .get();

  // This logic needs refinement based on exact data structure and notification tracking.
  // For now, just logging.
  console.log(`Checked ${snapshot.size} recent messages for notifications.`);
  
  return null;
});
