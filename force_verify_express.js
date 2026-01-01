const fs = require('fs');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
    apiVersion: '2025-01-27.acacia',
});

async function forceVerifyExpress() {
    const accountId = 'acct_1SeCnt5dR7TfH1s6'; // 対象のExpressアカウントID
    const dummyFilePath = 'dummy_id_express.png';

    try {
        console.log(`Attempting to verify Express account: ${accountId}`);

        // 1. Create a dummy PNG file
        const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync(dummyFilePath, pngBuffer);
        console.log('Created dummy ID image.');

        // 2. Upload the file to Stripe
        console.log('Uploading file to Stripe...');
        const fp = fs.createReadStream(dummyFilePath);
        const file = await stripe.files.create({
            purpose: 'identity_document',
            file: {
                data: fp,
                name: 'dummy_id.png',
                type: 'application/octet-stream',
            },
        });
        console.log('File uploaded:', file.id);

        // 3. Update the account with the document
        // Expressアカウントの場合、APIでの更新が制限されている場合があるが、テストモードなら通る可能性がある
        console.log(`Updating account ${accountId}...`);
        const account = await stripe.accounts.update(accountId, {
            individual: {
                verification: {
                    document: {
                        front: file.id,
                        back: file.id,
                    },
                },
            },
        });

        console.log('Account updated successfully.');
        console.log('Charges Enabled:', account.charges_enabled);
        console.log('Payouts Enabled:', account.payouts_enabled);
        
        if (account.requirements) {
            console.log('Requirements currently due:', account.requirements.currently_due);
        }

    } catch (error) {
        console.error('Error updating account:', error.message);
        if (error.code) console.error('Error Code:', error.code);
        if (error.type) console.error('Error Type:', error.type);
        
        console.log('\n--- 解説 ---');
        console.log('Expressアカウントのため、APIからの直接更新が許可されていない可能性があります。');
        console.log('その場合、ユーザー自身がStripeのOnboarding画面（Connect）で書類をアップロードする必要があります。');
    } finally {
        if (fs.existsSync(dummyFilePath)) {
            fs.unlinkSync(dummyFilePath);
        }
    }
}

forceVerifyExpress();
