
require('dotenv').config({ path: '.env.local' });
const { stripe } = require('./src/lib/stripe');

async function checkStripe() {
  try {
    const account = await stripe.accounts.retrieve();
    console.log('Stripe Account ID:', account.id);
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

checkStripe();
