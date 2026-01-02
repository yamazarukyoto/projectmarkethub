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
    from: '"Project Market Hub" <no-reply@pj-markethub.com>',
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

// 1. 蜍滄寔譛滄剞蛻・ｌ繝√ぉ繝・け (Daily)
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

// 2. 閾ｪ蜍墓､懷庶蜃ｦ逅・(Daily)
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
          "縲娠roject Market Hub縲題・蜍墓､懷庶縺ｮ縺顔衍繧峨○",
          `${contract.jobTitle} 縺ｮ讀懷庶縺瑚・蜍慕噪縺ｫ螳御ｺ・＠縺ｾ縺励◆縲ょｱ驟ｬ縺梧髪謇輔ｏ繧後∪縺吶Ａ
        );
      }
    } catch (error) {
      console.error(`Failed to auto-complete contract ${doc.id}:`, error);
    }
  }
  return null;
});

// 3. 譛ｪ隱ｭ繝｡繝・そ繝ｼ繧ｸ騾夂衍 (Every 15 mins)
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
        "縲娠roject Market Hub縲第眠逹繝｡繝・そ繝ｼ繧ｸ縺後≠繧翫∪縺・,
        `縺ゅ↑縺溘・ ${msgs.length} 莉ｶ縺ｮ譛ｪ隱ｭ繝｡繝・そ繝ｼ繧ｸ繧貞女縺大叙縺｣縺ｦ縺・∪縺吶・n\n繧ｵ繧､繝医↓繝ｭ繧ｰ繧､繝ｳ縺励※遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・nhttps://pj-markethub.com/messages`
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

// 4. 螂醍ｴ・せ繝・・繧ｿ繧ｹ螟画峩騾夂衍
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
          "縲娠roject Market Hub縲大･醍ｴ・′蜷域э縺輔ｌ縺ｾ縺励◆",
          `${worker?.displayName || "繝ｯ繝ｼ繧ｫ繝ｼ"} 縺梧｡井ｻｶ縲・{newData.jobTitle}縲阪・螂醍ｴ・↓蜷域э縺励∪縺励◆縲・n莉ｮ豎ｺ貂医ｒ陦後▲縺ｦ縺上□縺輔＞縲・n\nhttps://pj-markethub.com/client/contracts/${contractId}`
        );
      }
    }

    // 3. Payment Complete (waiting_for_escrow -> escrow)
    if (newData.status === "escrow") {
      if (worker && worker.email && worker.notificationSettings?.emailContract !== false) {
        await sendEmail(
          worker.email,
          "縲娠roject Market Hub縲台ｻｮ豎ｺ貂医′螳御ｺ・＠縺ｾ縺励◆",
          `譯井ｻｶ縲・{newData.jobTitle}縲阪・莉ｮ豎ｺ貂医′螳御ｺ・＠縺ｾ縺励◆縲・n讌ｭ蜍吶ｒ髢句ｧ九＠縺ｦ縺上□縺輔＞縲・n\nhttps://pj-markethub.com/worker/contracts/${contractId}`
        );
      }
    }

    // 4. Submitted (escrow/in_progress -> submitted)
    if (newData.status === "submitted") {
      if (client && client.email && client.notificationSettings?.emailContract !== false) {
        await sendEmail(
          client.email,
          "縲娠roject Market Hub縲醍ｴ榊刀蝣ｱ蜻翫′縺ゅｊ縺ｾ縺励◆",
          `${worker?.displayName || "繝ｯ繝ｼ繧ｫ繝ｼ"} 縺九ｉ譯井ｻｶ縲・{newData.jobTitle}縲阪・邏榊刀蝣ｱ蜻翫′縺ゅｊ縺ｾ縺励◆縲・n蜀・ｮｹ繧堤｢ｺ隱阪＠縲∵､懷庶繧定｡後▲縺ｦ縺上□縺輔＞縲・n\nhttps://pj-markethub.com/client/contracts/${contractId}`
        );
      }
    }

    // 5. Completed (submitted -> completed)
    if (newData.status === "completed") {
      if (worker && worker.email && worker.notificationSettings?.emailContract !== false) {
        await sendEmail(
          worker.email,
          "縲娠roject Market Hub縲第､懷庶縺悟ｮ御ｺ・＠縺ｾ縺励◆",
          `譯井ｻｶ縲・{newData.jobTitle}縲阪・讀懷庶縺悟ｮ御ｺ・＠縺ｾ縺励◆縲・n蝣ｱ驟ｬ縺梧髪謇輔ｏ繧後∪縺吶・n\nhttps://pj-markethub.com/worker/contracts/${contractId}`
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
          "縲娠roject Market Hub縲大･醍ｴ・が繝輔ぃ繝ｼ縺悟ｱ翫″縺ｾ縺励◆",
          `${client?.displayName || "繧ｯ繝ｩ繧､繧｢繝ｳ繝・} 縺九ｉ譯井ｻｶ縲・{data.jobTitle}縲阪・螂醍ｴ・が繝輔ぃ繝ｼ縺悟ｱ翫″縺ｾ縺励◆縲・n蜀・ｮｹ繧堤｢ｺ隱阪＠縲∝粋諢上＠縺ｦ縺上□縺輔＞縲・n\nhttps://pj-markethub.com/worker/contracts/${context.params.contractId}`
        );
      }
    }
    return null;
  });

// 5. 螳御ｺ・・繝ｭ繧ｸ繧ｧ繧ｯ繝医・閾ｪ蜍募炎髯､ (Daily)
// 螳御ｺ・∪縺溘・繧ｭ繝｣繝ｳ繧ｻ繝ｫ縺九ｉ3縺区怦邨碁℃縺励◆螂醍ｴ・ｒ蜑企勁
export const deleteOldCompletedContracts = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const threeMonthsAgoTimestamp = admin.firestore.Timestamp.fromDate(threeMonthsAgo);

  const contractsRef = db.collection("contracts");
  
  // completed縺ｮ螂醍ｴ・
  const completedSnapshot = await contractsRef
    .where("status", "==", "completed")
    .where("completedAt", "<", threeMonthsAgoTimestamp)
    .get();

  // cancelled縺ｮ螂醍ｴ・
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

// 6. 蜑企勁莠亥ｮ夐夂衍 (Daily)
// 蜑企勁2騾ｱ髢灘燕縺ｨ1騾ｱ髢灘燕縺ｫ騾夂衍
export const notifyUpcomingDeletion = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
  const now = new Date();
  
  // 2騾ｱ髢灘ｾ後↓蜑企勁莠亥ｮ夲ｼ・6譌･蜑阪↓螳御ｺ・＠縺溷･醍ｴ・ｼ・
  const twoWeeksBeforeDeletion = new Date(now.getTime() - 76 * 24 * 60 * 60 * 1000);
  const twoWeeksBeforeStart = new Date(twoWeeksBeforeDeletion.getTime() - 24 * 60 * 60 * 1000);
  
  // 1騾ｱ髢灘ｾ後↓蜑企勁莠亥ｮ夲ｼ・3譌･蜑阪↓螳御ｺ・＠縺溷･醍ｴ・ｼ・
  const oneWeekBeforeDeletion = new Date(now.getTime() - 83 * 24 * 60 * 60 * 1000);
  const oneWeekBeforeStart = new Date(oneWeekBeforeDeletion.getTime() - 24 * 60 * 60 * 1000);

  const contractsRef = db.collection("contracts");

  // 2騾ｱ髢灘燕騾夂衍
  const twoWeeksSnapshot = await contractsRef
    .where("status", "==", "completed")
    .where("completedAt", ">=", admin.firestore.Timestamp.fromDate(twoWeeksBeforeStart))
    .where("completedAt", "<", admin.firestore.Timestamp.fromDate(twoWeeksBeforeDeletion))
    .get();

  for (const doc of twoWeeksSnapshot.docs) {
    const contract = doc.data();
    // 譌｢縺ｫ騾夂衍貂医∩縺九メ繧ｧ繝・け
    if (contract.deletionNotified2Weeks) continue;

    const client = await getUser(contract.clientId);
    const worker = await getUser(contract.workerId);

    // 繧ｯ繝ｩ繧､繧｢繝ｳ繝医↓騾夂衍
    if (client && client.email) {
      await sendEmail(
        client.email,
        "縲娠roject Market Hub縲大･醍ｴ・ョ繝ｼ繧ｿ蜑企勁縺ｮ縺顔衍繧峨○・・騾ｱ髢灘燕・・,
        `譯井ｻｶ縲・{contract.jobTitle}縲阪・螂醍ｴ・ョ繝ｼ繧ｿ縺ｯ縲∝ｮ御ｺ・°繧・縺区怦蠕後↓閾ｪ蜍募炎髯､縺輔ｌ縺ｾ縺吶・n\n蜑企勁莠亥ｮ壽律: 邏・騾ｱ髢灘ｾ圭n\n蠢・ｦ√↑繝・・繧ｿ・育ｴ榊刀迚ｩ縲√Γ繝・そ繝ｼ繧ｸ遲会ｼ峨・縲∝炎髯､蜑阪↓繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｦ菫晏ｭ倥＠縺ｦ縺上□縺輔＞縲・n\nhttps://pj-markethub.com/client/contracts/${doc.id}`
      );
    }

    // 繝ｯ繝ｼ繧ｫ繝ｼ縺ｫ騾夂衍
    if (worker && worker.email) {
      await sendEmail(
        worker.email,
        "縲娠roject Market Hub縲大･醍ｴ・ョ繝ｼ繧ｿ蜑企勁縺ｮ縺顔衍繧峨○・・騾ｱ髢灘燕・・,
        `譯井ｻｶ縲・{contract.jobTitle}縲阪・螂醍ｴ・ョ繝ｼ繧ｿ縺ｯ縲∝ｮ御ｺ・°繧・縺区怦蠕後↓閾ｪ蜍募炎髯､縺輔ｌ縺ｾ縺吶・n\n蜑企勁莠亥ｮ壽律: 邏・騾ｱ髢灘ｾ圭n\n蠢・ｦ√↑繝・・繧ｿ・育ｴ榊刀迚ｩ縲√Γ繝・そ繝ｼ繧ｸ遲会ｼ峨・縲∝炎髯､蜑阪↓繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｦ菫晏ｭ倥＠縺ｦ縺上□縺輔＞縲・n\nhttps://pj-markethub.com/worker/contracts/${doc.id}`
      );
    }

    // 騾夂衍貂医∩繝輔Λ繧ｰ繧定ｨｭ螳・
    await doc.ref.update({ deletionNotified2Weeks: true });
  }

  // 1騾ｱ髢灘燕騾夂衍
  const oneWeekSnapshot = await contractsRef
    .where("status", "==", "completed")
    .where("completedAt", ">=", admin.firestore.Timestamp.fromDate(oneWeekBeforeStart))
    .where("completedAt", "<", admin.firestore.Timestamp.fromDate(oneWeekBeforeDeletion))
    .get();

  for (const doc of oneWeekSnapshot.docs) {
    const contract = doc.data();
    // 譌｢縺ｫ騾夂衍貂医∩縺九メ繧ｧ繝・け
    if (contract.deletionNotified1Week) continue;

    const client = await getUser(contract.clientId);
    const worker = await getUser(contract.workerId);

    // 繧ｯ繝ｩ繧､繧｢繝ｳ繝医↓騾夂衍
    if (client && client.email) {
      await sendEmail(
        client.email,
        "縲娠roject Market Hub縲大･醍ｴ・ョ繝ｼ繧ｿ蜑企勁縺ｮ縺顔衍繧峨○・・騾ｱ髢灘燕・・,
        `縲宣㍾隕√第｡井ｻｶ縲・{contract.jobTitle}縲阪・螂醍ｴ・ョ繝ｼ繧ｿ縺ｯ縲√∪繧ゅ↑縺剰・蜍募炎髯､縺輔ｌ縺ｾ縺吶・n\n蜑企勁莠亥ｮ壽律: 邏・騾ｱ髢灘ｾ圭n\n蠢・ｦ√↑繝・・繧ｿ・育ｴ榊刀迚ｩ縲√Γ繝・そ繝ｼ繧ｸ遲会ｼ峨・縲∽ｻ翫☆縺舌ム繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｦ菫晏ｭ倥＠縺ｦ縺上□縺輔＞縲・n\nhttps://pj-markethub.com/client/contracts/${doc.id}`
      );
    }

    // 繝ｯ繝ｼ繧ｫ繝ｼ縺ｫ騾夂衍
    if (worker && worker.email) {
      await sendEmail(
        worker.email,
        "縲娠roject Market Hub縲大･醍ｴ・ョ繝ｼ繧ｿ蜑企勁縺ｮ縺顔衍繧峨○・・騾ｱ髢灘燕・・,
        `縲宣㍾隕√第｡井ｻｶ縲・{contract.jobTitle}縲阪・螂醍ｴ・ョ繝ｼ繧ｿ縺ｯ縲√∪繧ゅ↑縺剰・蜍募炎髯､縺輔ｌ縺ｾ縺吶・n\n蜑企勁莠亥ｮ壽律: 邏・騾ｱ髢灘ｾ圭n\n蠢・ｦ√↑繝・・繧ｿ・育ｴ榊刀迚ｩ縲√Γ繝・そ繝ｼ繧ｸ遲会ｼ峨・縲∽ｻ翫☆縺舌ム繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｦ菫晏ｭ倥＠縺ｦ縺上□縺輔＞縲・n\nhttps://pj-markethub.com/worker/contracts/${doc.id}`
      );
    }

    // 騾夂衍貂医∩繝輔Λ繧ｰ繧定ｨｭ螳・
    await doc.ref.update({ deletionNotified1Week: true });
  }

  console.log(`Sent deletion notifications: 2 weeks=${twoWeeksSnapshot.size}, 1 week=${oneWeekSnapshot.size}`);
  return null;
});
