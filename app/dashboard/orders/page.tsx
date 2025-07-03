/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, CheckCircle, XCircle, ShoppingBag, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products: {
    name: string;
    image_url: string[];
  } | null;
}

interface ShippingAddress {
  id: string;
  full_name: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
}

interface Order {
  id: string;
  created_at: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  shipping_cost: number;
  order_items: OrderItem[];
  shipping_addresses: ShippingAddress | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

const statusIcons = {
  pending: Clock,
  processing: Package,
  shipped: Package,
  delivered: CheckCircle,
  cancelled: XCircle,
} as const;

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
} as const;

const statusLabels = {
  pending: "Pendiente",
  processing: "En proceso",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
} as const;

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const auth = await requireAuth('admin');
      if (auth) {
        setIsAuthenticated(true);
      }
    }
    
    checkAuth();
    document.title = 'Sapphirus - Gestión de Pedidos';
  }, []);

const { data: orders, isLoading, error } = useQuery({
  queryKey: ['admin-orders'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          order_id,
          quantity,
          unit_price,
          product_id,
          products (
            name,
            image_url
          )
        ),
        shipping_addresses (  
          id,
          full_name,
          phone,
          street_address,
          city,
          state,
          postal_code
        ),
        profiles (  
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });
    

      console.log(data);

      if (error) throw error;
      return data as unknown as Order[];
    },
    enabled: isAuthenticated
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: "Estado actualizado",
        description: "El estado del pedido se ha actualizado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  // Helper function to get the first valid image URL
  const getFirstImageUrl = (imageUrl: string | string[]): string => {
    if (!imageUrl) return 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc';
    
    if (typeof imageUrl === 'string') {
      try {
        const parsed = JSON.parse(imageUrl);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc';
      } catch {
        return imageUrl;
      }
    }
    
    return Array.isArray(imageUrl) && imageUrl.length > 0 
      ? imageUrl[0] 
      : 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc';
  };

  if (!isAuthenticated || isLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <XCircle className="h-16 w-16 text-red-500 mb-6" />
            <h2 className="text-2xl font-semibold mb-4">Error al cargar pedidos</h2>
            <p className="mt-2 text-muted-foreground max-w-md text-center">
              Ha ocurrido un error al cargar los pedidos. Por favor, intenta nuevamente más tarde.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mb-6" />
              <h2 className="text-2xl font-semibold mb-4">No hay pedidos</h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                Aún no se han realizado pedidos en la tienda.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-2xl font-bold">Gestión de Pedidos</h1>
          <p className="text-muted-foreground mt-2">
            Administra todos los pedidos de la tienda
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
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CardTitle className="text-lg">
                          Pedido #{order.id.slice(0, 8)}
                        </CardTitle>
                        <Badge className={statusColors[order.status]}>
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {statusLabels[order.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={order.status}
                          onValueChange={(status) => 
                            updateOrderStatus.mutate({ orderId: order.id, status })
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="processing">En proceso</SelectItem>
                            <SelectItem value="shipped">Enviado</SelectItem>
                            <SelectItem value="delivered">Entregado</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleOrderExpansion(order.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Cliente</h4>
                        <p className="font-medium">{order.profiles?.full_name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{order.profiles?.email}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Fecha</h4>
                        <p>{new Date(order.created_at).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Total</h4>
                        <p className="text-lg font-semibold">${order.total_amount.toFixed(2)}</p>
                        {order.shipping_cost > 0 && (
                          <p className="text-sm text-muted-foreground">
                            (Incluye envío: ${order.shipping_cost.toFixed(2)})
                          </p>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t space-y-6"
                      >
                        {/* Productos */}
                        <div>
                          <h4 className="font-medium mb-3">Productos</h4>
                          <div className="space-y-3">
                            {order.order_items?.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-4 py-2 border rounded-lg px-3"
                              >
                                <div className="h-16 w-16 relative rounded overflow-hidden">
                                  <img
                                    src={getFirstImageUrl(item.products?.image_url || [])}
                                    alt={item.products?.name || 'Producto'}
                                    className="object-cover w-full h-full"
                                  />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-medium">{item.products?.name || 'Producto'}</h5>
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
                          </div>
                        </div>

                        {/* Dirección de envío */}
                        {order.shipping_addresses && (
                          <div>
                            <h4 className="font-medium mb-3">Dirección de Envío</h4>
                            <div className="bg-muted p-4 rounded-lg">
                              <p className="font-medium">{order.shipping_addresses.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.shipping_addresses.street_address}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {order.shipping_addresses.city}, {order.shipping_addresses.state} {order.shipping_addresses.postal_code}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Tel: {order.shipping_addresses.phone}
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}