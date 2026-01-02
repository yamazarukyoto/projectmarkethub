const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env.local' });

const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkJobAttachments() {
    const jobId = "sgD6DCFLezXg8JrADGi1"; // 対象のJob ID

    console.log(`Checking Job ID: ${jobId}`);
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
        console.log("Job not found");
        return;
    }
    
    const data = jobDoc.data();
    console.log("\n=== Job Title ===");
    console.log(data.title);
    
    console.log("\n=== Attachments ===");
    console.log("Type:", typeof data.attachments);
    console.log("Is Array:", Array.isArray(data.attachments));
    console.log("Length:", data.attachments?.length);
    console.log("\nRaw attachments data:");
    console.log(JSON.stringify(data.attachments, null, 2));
    
    if (data.attachments && data.attachments.length > 0) {
        console.log("\n=== Each attachment ===");
        data.attachments.forEach((att, index) => {
            console.log(`\n--- Attachment ${index + 1} ---`);
            console.log("Type:", typeof att);
            if (typeof att === 'string') {
                console.log("URL:", att);
                // URLからファイル名を抽出するテスト
                try {
                    const urlObj = new URL(att);
                    let pathname = decodeURIComponent(urlObj.pathname);
                    console.log("Decoded pathname:", pathname);
                    
                    if (pathname.includes('/o/')) {
                        pathname = pathname.split('/o/')[1] || pathname;
                        console.log("After /o/ split:", pathname);
                    }
                    
                    const parts = pathname.split('/');
                    let lastPart = parts[parts.length - 1];
                    console.log("Last part:", lastPart);
                    
                    if (lastPart.includes('%2F')) {
                        lastPart = decodeURIComponent(lastPart);
                        const subParts = lastPart.split('/');
                        lastPart = subParts[subParts.length - 1];
                        console.log("After %2F decode:", lastPart);
                    }
                    
                    if (lastPart.includes('_')) {
                        const nameParts = lastPart.split('_');
                        if (/^\d+$/.test(nameParts[0])) {
                            const fileName = nameParts.slice(1).join('_');
                            console.log("Extracted filename:", fileName);
                        } else {
                            console.log("First part is not timestamp:", nameParts[0]);
                        }
                    }
                } catch (e) {
                    console.log("Error parsing URL:", e.message);
                }
            } else {
                console.log("Object:", JSON.stringify(att, null, 2));
            }
        });
    }
}

checkJobAttachments().catch(console.error);
