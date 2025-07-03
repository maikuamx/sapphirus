"use client"

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShippingAddress } from '@/types/shipping';

interface CheckoutFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  items: any[];
  total: number;
  shippingAddress: ShippingAddress;
  shippingCost: number;
}

export default function CheckoutForm({ 
  onSuccess, 
  onCancel, 
  items, 
  total, 
  shippingAddress,
  shippingCost 
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const createOrder = async (paymentIntentId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No authenticated session');

      // Create order in database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: session.user.id,
          status: 'processing',
          total_amount: total,
          shipping_address_id: shippingAddress.id,
          shipping_cost: shippingCost,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items and update product stock
      for (const item of items) {
        // Add order item
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.price,
            created_at: new Date().toISOString()
          });

        if (itemError) throw itemError;

        // Update product stock
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.productId)
          .single();

        if (productError) throw productError;

        const newStock = Math.max(0, product.stock - item.quantity);
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.productId);

        if (updateError) throw updateError;
      }

      console.log(`Order created: ${order.id}`);
      return order.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Error al procesar el pago",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded, create order directly
        try {
          await createOrder(paymentIntent.id);
          toast({
            title: "Pago exitoso",
            description: "Tu pago ha sido procesado correctamente",
          });
          onSuccess();
          router.push('/checkout/success');
        } catch (orderError: any) {
          toast({
            title: "Error al crear el pedido",
            description: "Tu pago fue procesado pero hubo un problema al crear el pedido",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al procesar el pago",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="min-h-[200px]">
          <PaymentElement 
            options={{
              layout: 'tabs',
              paymentMethodOrder: ['card'],
            }}
          />
        </div>
        
        <div className="flex justify-end gap-4 pt-4 border-t sticky bottom-0 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Volver
          </Button>
          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="min-w-[120px]"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                Procesando...
              </>
            ) : (
              `Pagar $${total.toFixed(2)}`
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}