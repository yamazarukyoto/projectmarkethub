const fs = require('fs');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
    apiVersion: '2025-01-27.acacia',
});

async function verifyCustomAccount() {
    const accountId = 'acct_1SeSXzG7FhEsJzcQ'; // 先ほど作成したCustomアカウントID
    const dummyFilePath = 'dummy_id.png';

    try {
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

        console.log('Account updated.');
        console.log('Charges Enabled:', account.charges_enabled);
        console.log('Payouts Enabled:', account.payouts_enabled);
        
        if (account.requirements) {
            console.log('Requirements currently due:', account.requirements.currently_due);
            console.log('Disabled reason:', account.requirements.disabled_reason);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (fs.existsSync(dummyFilePath)) {
            fs.unlinkSync(dummyFilePath);
        }
    }
}

verifyCustomAccount();
