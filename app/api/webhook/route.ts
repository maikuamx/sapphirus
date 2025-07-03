import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { CartItem } from '@/types/cart';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const event = JSON.parse(payload);

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      try {
        // Extract metadata
        const userId = paymentIntent.metadata.userId;
        const items: CartItem[] = JSON.parse(paymentIntent.metadata.items || '[]');
        const shippingAddressId = paymentIntent.metadata.shippingAddressId;
        const shippingCost = parseFloat(paymentIntent.metadata.shippingCost || '0');
        
        if (!userId || !items.length || !shippingAddressId) {
          throw new Error('Missing required metadata');
        }

        // Check if an order already exists for this payment intent
        const { data: existingOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', userId)
          .eq('total_amount', paymentIntent.amount / 100)
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Orders created in the last 5 minutes
          .limit(1);

        if (existingOrders && existingOrders.length > 0) {
          console.log(`Order already exists for payment intent ${paymentIntent.id}`);
          return NextResponse.json({ received: true, status: 'order_exists' });
        }

        // Create order in database
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: userId,
            status: 'processing',
            total_amount: paymentIntent.amount / 100, // Convert from cents
            shipping_address_id: shippingAddressId,
            shipping_cost: shippingCost,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Process each item in the order
        for (const item of items) {
          try {
            // First, get the current product stock
            const { data: product, error: productError } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.productId)
              .single();

            if (productError) {
              console.error(`Error fetching product ${item.productId}:`, productError);
              continue;
            }

            if (!product) {
              console.error(`Product ${item.productId} not found`);
              continue;
            }

            // Create order item
            const { error: itemError } = await supabase
              .from('order_items')
              .insert({
                order_id: order.id,
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: item.price,
                created_at: new Date().toISOString()
              });

            if (itemError) {
              console.error(`Error creating order item for product ${item.productId}:`, itemError);
              continue;
            }

            // Calculate and update new stock
            const newStock = Math.max(0, product.stock - item.quantity);
            const { error: updateError } = await supabase
              .from('products')
              .update({ 
                stock: newStock,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.productId);

            if (updateError) {
              console.error(`Error updating stock for product ${item.productId}:`, updateError);
            } else {
              console.log(`Successfully updated stock for product ${item.productId} from ${product.stock} to ${newStock}`);
            }
          } catch (itemProcessError) {
            console.error(`Error processing item ${item.productId}:`, itemProcessError);
          }
        }

        console.log(`Payment succeeded and order created: ${order.id}`);
        return NextResponse.json({ 
          received: true, 
          orderId: order.id,
          status: 'success'
        });

      } catch (error) {
        console.error('Error processing payment success:', error);
        return NextResponse.json({ 
          error: 'Error processing payment',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { 
          status: 500 
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ 
      error: 'Webhook processing error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 400 
    });
  }
}