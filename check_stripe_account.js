const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
    apiVersion: '2025-01-27.acacia',
    typescript: true,
});

async function checkStripeAccount() {
  const accountId = 'acct_1SeCnt5dR7TfH1s6';
  try {
    console.log(`Checking Stripe account: ${accountId}...`);
    const account = await stripe.accounts.retrieve(accountId);
    console.log('Account Details:', JSON.stringify(account, null, 2));
    
    console.log('-----------------------------------');
    console.log('Charges Enabled:', account.charges_enabled);
    console.log('Payouts Enabled:', account.payouts_enabled);
    console.log('Details Submitted:', account.details_submitted);
    
    if (account.requirements) {
        console.log('\n--- Requirements ---');
        console.log('Currently Due:', JSON.stringify(account.requirements.currently_due, null, 2));
        console.log('Eventually Due:', JSON.stringify(account.requirements.eventually_due, null, 2));
        console.log('Past Due:', JSON.stringify(account.requirements.past_due, null, 2));
        console.log('Disabled Reason:', account.requirements.disabled_reason);
    }
  } catch (error) {
    console.error('Stripe Error:', error.message);
  }
}

checkStripeAccount();
