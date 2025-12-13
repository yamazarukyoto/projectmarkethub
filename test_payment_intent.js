require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-01-27.acacia',
});

async function testPaymentIntent() {
  try {
    console.log('Creating Payment Intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'jpy',
      capture_method: 'manual',
      metadata: { integration_check: 'accept_a_payment' },
      automatic_payment_methods: {
          enabled: true,
      },
    });
    console.log('Success!');
    console.log('Payment Intent ID:', paymentIntent.id);
    console.log('Client Secret:', paymentIntent.client_secret);
    console.log('Status:', paymentIntent.status);
  } catch (error) {
    console.error('Error creating Payment Intent:', error.message);
  }
}

testPaymentIntent();
