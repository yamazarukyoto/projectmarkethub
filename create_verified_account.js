const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
    apiVersion: '2025-01-27.acacia',
});

async function createVerifiedAccount() {
    try {
        console.log('Creating new Express account...');
        
        // 1. Create Account with requested capabilities
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'JP',
            email: 'kenta.yamamoto.mobile@gmail.com',
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: 'individual',
            business_profile: {
                url: 'https://pj-markethub.com',
                mcc: '5734', // Computer Software Stores
            },
            tos_acceptance: {
                date: Math.floor(Date.now() / 1000),
                ip: '127.0.0.1', // Test IP
            },
        });

        console.log('Account created:', account.id);

        // 2. Update account with test data to bypass verification
        // In test mode, providing specific values triggers automatic verification
        console.log('Updating account with verification data...');
        
        await stripe.accounts.update(account.id, {
            individual: {
                first_name: 'Kenta',
                last_name: 'Yamamoto',
                first_name_kana: '繧ｱ繝ｳ繧ｿ',
                last_name_kana: '繝､繝槭Δ繝・,
                first_name_kanji: '蛛･螟ｪ',
                last_name_kanji: '螻ｱ譛ｬ',
                dob: {
                    day: 1,
                    month: 1,
                    year: 1990,
                },
                address: {
                    line1: '1-1-1',
                    line2: 'Test Building',
                    city: 'Minato-ku',
                    state: 'Tokyo',
                    postal_code: '100-0001',
                    country: 'JP',
                },
                address_kana: {
                    line1: '・托ｼ搾ｼ托ｼ搾ｼ・,
                    line2: '繝・せ繝医ン繝ｫ',
                    city: '繝溘リ繝医け',
                    state: '繝医え繧ｭ繝ｧ繧ｦ',
                    postal_code: '100-0001',
                    country: 'JP',
                },
                address_kanji: {
                    line1: '1-1-1',
                    line2: '繝・せ繝医ン繝ｫ',
                    city: '貂ｯ蛹ｺ',
                    state: '譚ｱ莠ｬ驛ｽ',
                    postal_code: '100-0001',
                    country: 'JP',
                },
                email: 'kenta.yamamoto.mobile@gmail.com',
                phone: '09012345678',
            },
            settings: {
                payouts: {
                    schedule: {
                        interval: 'manual', // Manual payouts for testing
                    },
                },
            },
        });

        // 3. Add external account (Bank Account)
        // Use test bank token 'btok_jp' for Japan
        console.log('Adding external bank account...');
        await stripe.accounts.createExternalAccount(account.id, {
            external_account: 'btok_jp', 
        });

        // 4. Retrieve updated account to check status
        const updatedAccount = await stripe.accounts.retrieve(account.id);
        console.log('-----------------------------------');
        console.log('New Account ID:', updatedAccount.id);
        console.log('Charges Enabled:', updatedAccount.charges_enabled);
        console.log('Payouts Enabled:', updatedAccount.payouts_enabled);
        console.log('Details Submitted:', updatedAccount.details_submitted);
        
        if (updatedAccount.requirements) {
            console.log('Requirements currently due:', updatedAccount.requirements.currently_due);
            console.log('Disabled reason:', updatedAccount.requirements.disabled_reason);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

createVerifiedAccount();

