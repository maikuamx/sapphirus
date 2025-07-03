/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { Stripe } from '@stripe/stripe-js';
import { getStripe } from '@/lib/stripe';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import CheckoutForm from './checkout-form';
import ShippingAddressSelector from '@/components/shipping/shipping-address-selector';
import { CartItem } from '@/types/cart';
import { ShippingAddress } from '@/types/shipping';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PaymentFormProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  items: CartItem[];
}

export default function PaymentForm({ amount, onSuccess, onCancel, items }: PaymentFormProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [step, setStep] = useState<'address' | 'payment'>('address');
  const { toast } = useToast();

  const totalWithShipping = amount + shippingCost;

  useEffect(() => {
    getStripe().then(setStripe);
  }, []);

  useEffect(() => {
    const createPaymentIntent = async () => {
      if (!selectedAddress || step !== 'payment') return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No authenticated session');

        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            amount: Math.round(totalWithShipping * 100),
            items,
            shippingAddress: selectedAddress,
            shippingCost
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create payment intent');
        }

        const data = await response.json();
        if (!data.clientSecret) {
          throw new Error('Invalid response from payment service');
        }

        setClientSecret(data.clientSecret);
      } catch (error: any) {
        
        toast({
          title: "Error",
          description: error.message || "Error al procesar el pago",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedAddress && step === 'payment') {
      createPaymentIntent();
    }
  }, [selectedAddress, step, totalWithShipping, items, shippingCost, toast]);

  const handleAddressSelect = (address: ShippingAddress) => {
    setSelectedAddress(address);
  };

  const handleShippingCostChange = (cost: number) => {
    setShippingCost(cost);
  };

  const handleContinueToPayment = () => {
    if (!selectedAddress) {
      toast({
        title: "Error",
        description: "Por favor selecciona una dirección de envío",
        variant: "destructive"
      });
      return;
    }
    setStep('payment');
  };

  if (step === 'address') {
    return (
      <div className="max-h-[80vh] overflow-y-auto space-y-6 pr-2">
        <ShippingAddressSelector
          selectedAddressId={selectedAddress?.id}
          onAddressSelect={handleAddressSelect}
          onShippingCostChange={handleShippingCostChange}
        />

        {selectedAddress && (
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de productos */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Productos:</h4>
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2">
                    <div className="h-12 w-12 relative rounded overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-sm truncate">{item.name}</h5>
                      <p className="text-xs text-muted-foreground">
                        Cantidad: {item.quantity} × ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-medium text-sm">
                        ${(item.quantity * item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              {/* Totales */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío:</span>
                  <span>${shippingCost.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>${totalWithShipping.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4 sticky bottom-0 bg-background py-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleContinueToPayment}
            disabled={!selectedAddress}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar al Pago
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !stripe || !clientSecret) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-h-[80vh] overflow-y-auto space-y-6 pr-2">
      {/* Resumen de dirección seleccionada */}
      <Card>
        <CardHeader>
          <CardTitle>Dirección de Envío</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <p className="font-medium">{selectedAddress?.full_name}</p>
            <p>{selectedAddress?.street_address}</p>
            <p>{selectedAddress?.city}, {selectedAddress?.state} {selectedAddress?.postal_code}</p>
            <p>Tel: {selectedAddress?.phone}</p>
          </div>
          <button
            onClick={() => setStep('address')}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Cambiar dirección
          </button>
        </CardContent>
      </Card>

      {/* Resumen del pedido con productos */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen del Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de productos */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Productos:</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2">
                  <div className="h-12 w-12 relative rounded overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-sm truncate">{item.name}</h5>
                    <p className="text-xs text-muted-foreground">
                      Cantidad: {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-medium text-sm">
                      ${(item.quantity * item.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Totales */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Envío:</span>
              <span>${shippingCost.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span>${totalWithShipping.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de pago */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripe} options={{ 
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#708090',
                borderRadius: '8px',
                spacingUnit: '4px',
                fontFamily: 'Inter, system-ui, sans-serif',
              }
            }
          }}>
            <CheckoutForm 
              onSuccess={onSuccess} 
              onCancel={() => setStep('address')}
              items={items}
              total={totalWithShipping}
              shippingAddress={selectedAddress!}
              shippingCost={shippingCost}
            />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}