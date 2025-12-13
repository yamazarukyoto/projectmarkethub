require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkStripe() {
  try {
    console.log('Checking Stripe connection...');
    const account = await stripe.accounts.retrieve();
    console.log('Success! Connected to Stripe.');
    console.log('Account ID:', account.id);
    console.log('Charges Enabled:', account.charges_enabled);
    console.log('Payouts Enabled:', account.payouts_enabled);
    console.log('Mode:', process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'Test Mode' : 'Live Mode');
  } catch (error) {
    console.error('Stripe Connection Error:', error.message);
  }
}

checkStripe();
