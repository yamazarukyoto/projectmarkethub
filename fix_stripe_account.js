const fs = require('fs');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
    apiVersion: '2025-01-27.acacia',
});

async function fixAccount() {
    const accountId = 'acct_1SeCnt5dR7TfH1s6';
    const dummyFilePath = 'dummy_id.png';

    try {
        // 1. Create a dummy PNG file (1x1 pixel transparent PNG)
        const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync(dummyFilePath, pngBuffer);
        console.log('Created dummy ID image.');

        // 2. Upload the file to Stripe
        console.log('Uploading file to Stripe...');
        // Node.js environment: pass the file stream
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

        // 3. Update the account
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
        
        if (account.requirements && account.requirements.currently_due) {
            console.log('Requirements currently due:', account.requirements.currently_due);
        }
        
        if (account.requirements && account.requirements.disabled_reason) {
             console.log('Disabled reason:', account.requirements.disabled_reason);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Cleanup
        if (fs.existsSync(dummyFilePath)) {
            fs.unlinkSync(dummyFilePath);
        }
    }
}

fixAccount();
