/* eslint-disable @next/next/no-img-element */
"use client"

import { useState } from 'react';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from '@/components/ui/input';
import PaymentForm from '@/components/checkout/payment-form';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function CartSheet() {
  const { cart, removeItem, updateQuantity, clearCart } = useCartStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { toast } = useToast();

  // Fetch current stock levels for all products in cart
  const { data: products } = useQuery({
    queryKey: ['products', cart.items.map(item => item.productId)],
    queryFn: async () => {
      if (cart.items.length === 0) return [];
      
      const { data } = await supabase
        .from('products')
        .select('id, stock')
        .in('id', cart.items.map(item => item.productId));
      
      return data || [];
    },
    enabled: cart.items.length > 0
  });

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity > product.stock) {
      toast({
        title: "Error",
        description: `Solo hay ${product.stock} unidades disponibles`,
        variant: "destructive"
      });
      return;
    }

    updateQuantity(productId, newQuantity);
  };

  const handleCheckoutSuccess = () => {
    clearCart();
    setIsCheckingOut(false);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingBag className="h-5 w-5" />
          {cart.items.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {cart.items.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Carrito de Compras</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          {cart.items.length === 0 ? (
            <div className="text-center py-6">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">Tu carrito está vacío</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Agrega algunos productos para comenzar
              </p>
            </div>
          ) : isCheckingOut ? (
            <div className="h-full overflow-hidden">
              <PaymentForm
                amount={cart.total}
                items={cart.items}
                onSuccess={handleCheckoutSuccess}
                onCancel={() => setIsCheckingOut(false)}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {cart.items.map((item) => {
                  const product = products?.find(p => p.id === item.productId);
                  const maxStock = product?.stock || 0;
                  
                  return (
                    <div
                      key={item.id}
                      className="flex items-center space-x-4 py-2 border-b"
                    >
                      <div className="h-16 w-16 relative rounded overflow-hidden flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          ${item.price.toFixed(2)}
                        </p>
                        {maxStock < item.quantity && (
                          <p className="text-sm text-red-600">
                            Solo hay {maxStock} unidades disponibles
                          </p>
                        )}
                        <div className="flex items-center space-x-2 mt-2">
                          <Input
                            type="number"
                            min="1"
                            max={maxStock}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value))}
                            className="w-20"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="pt-4 border-t mt-4">
                <div className="flex justify-between text-lg font-medium">
                  <span>Total</span>
                  <span>${cart.total.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full mt-4"
                  onClick={() => setIsCheckingOut(true)}
                  disabled={cart.items.some(item => {
                    const product = products?.find(p => p.id === item.productId);
                    return !product || item.quantity > product.stock;
                  })}
                >
                  Proceder al Pago
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}