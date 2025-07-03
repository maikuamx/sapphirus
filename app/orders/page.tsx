/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, CheckCircle, XCircle, ShoppingBag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import OrderReceipt from '@/components/orders/order-receipt';
import { Order } from '@/types/order';
import { statusColors, statusLabels } from '@/types/enums';

interface RawOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products: {
    name: string;
    image_url: string | string[];
  } | null;
}

interface RawOrder extends Omit<Order, 'order_items'> {
  order_items: RawOrderItem[];
}

const statusIcons = {
  pending: Clock,
  processing: Package,
  shipped: Package,
  delivered: CheckCircle,
  cancelled: XCircle,
} as const;

export default function OrdersPage() {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Sapphirus - Mis Pedidos';
  }, []);

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            products (
              name,
              image_url
            )
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });


      
      if (error) throw error;

      // Transform the raw data to match our Order type
      return (data as RawOrder[])?.map(order => ({
        ...order,
        order_items: order.order_items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product: {
            name: item.products?.name || 'Producto no disponible',
            image_url: parseImageUrls(item.products?.image_url)
          }
        }))
      }));
    }
  });

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  // Helper function to parse image URLs
  const parseImageUrls = (imageUrl: string | string[] | undefined | null): string[] => {
    if (!imageUrl) return [];
    
    if (typeof imageUrl === 'string') {
      try {
        const parsed = JSON.parse(imageUrl);
        return Array.isArray(parsed) ? parsed : [imageUrl];
      } catch {
        return [imageUrl];
      }
    }
    
    return Array.isArray(imageUrl) ? imageUrl : [];
  };

  // Helper function to get the first valid image URL
  const getFirstImageUrl = (imageUrl: string[]): string => {
    return imageUrl[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/50 pt-20">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <XCircle className="h-16 w-16 text-red-500 mb-6" />
              <h2 className="text-2xl font-semibold mb-4">Error al cargar pedidos</h2>
              <p className="mt-2 text-muted-foreground max-w-md text-center">
                Ha ocurrido un error al cargar tus pedidos. Por favor, intenta nuevamente más tarde.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="min-h-screen bg-muted/50 pt-20">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mb-6" />
                <h2 className="text-2xl font-semibold mb-4">¡Aún no tienes pedidos!</h2>
                <p className="text-muted-foreground mb-8 max-w-md">
                  Explora nuestro catálogo de productos y encuentra algo especial para ti.
                </p>
                <Button asChild size="lg">
                  <a href="/products">
                    Explorar Catálogo
                  </a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 pt-20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-2xl font-bold">Mis Pedidos</h1>
            <p className="text-muted-foreground mt-2">
              Historial de todos tus pedidos
            </p>
          </div>

          <div className="space-y-6">
            {orders.map((order) => {
              const StatusIcon = statusIcons[order.status];
              const isExpanded = expandedOrder === order.id;
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader 
                      className="flex flex-row items-center justify-between cursor-pointer"
                      onClick={() => toggleOrderExpansion(order.id)}
                    >
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          Pedido #{order.id.slice(0, 8)}
                        </CardTitle>
                      </div>
                      <div className={`flex items-center gap-2 ${statusColors[order.status]}`}>
                        <StatusIcon className="h-5 w-5" />
                        <span>{statusLabels[order.status]}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {order.order_items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-4 py-2 border-b last:border-0"
                          >
                            <div className="h-16 w-16 relative rounded overflow-hidden">
                              <img
                                src={getFirstImageUrl(item.product.image_url)}
                                alt={item.product.name}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium">{item.product.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Cantidad: {item.quantity} × ${item.unit_price.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                ${(item.quantity * item.unit_price).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-4 border-t">
                          <div className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-lg font-semibold">
                            Total: ${order.total_amount.toFixed(2)}
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-6 pt-6 border-t"
                          >
                            <OrderReceipt order={order} />
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}