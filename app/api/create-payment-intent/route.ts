import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { CartItem } from '@/types/cart';
import { ShippingAddress } from '@/types/shipping';
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { amount, items, shippingAddress, shippingCost } = await request.json();

    // Get the user session from the request
    const authHeader = request.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      // Get user from token
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (!authError && user) {
        userId = user.id;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "mxn",
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: userId,
        items: JSON.stringify(items || []),
        shippingAddressId: shippingAddress?.id || '',
        shippingCost: shippingCost?.toString() || '0',
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Internal Error:", error);
    // Handle other errors (e.g., network issues, parsing errors)
    return NextResponse.json(
      { error: `Internal Server Error: ${error}` },
      { status: 500 }
    );
  }
}