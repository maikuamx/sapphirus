/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, CheckCircle, XCircle, ShoppingBag, Eye, ChevronDown, ChevronUp, User, Calendar, DollarSign } from 'lucide-react';
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
    image_url: string | string[];
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
  user_id: string;
  shipping_address_id: string | null;
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
      
      
      try {
        // Step 1: Get ALL orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (ordersError) {
          
          throw ordersError;
        }

        

        if (!ordersData || ordersData.length === 0) {
          
          return [];
        }

        // Step 2: Get ALL unique user_ids from orders (these are our customers)
        const allCustomerIds = [...new Set(ordersData.map(order => order.user_id))];
        
        

        // Step 3: Get profiles for ALL customers who have made orders
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', allCustomerIds);

        if (profilesError) {
          
          throw profilesError;
        }
        
        
        

        // Step 4: Get ALL order items
        const orderIds = ordersData.map(order => order.id);
        

        const { data: orderItemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) {
          
          throw itemsError;
        }
        

        // Step 5: Get products for the order items
        let productsData: any[] = [];
        if (orderItemsData && orderItemsData.length > 0) {
          const productIds = [...new Set(orderItemsData.map(item => item.product_id))];
          

          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, name, image_url')
            .in('id', productIds);

          if (productsError) {
            
            throw productsError;
          }
          productsData = products || [];
          
        }

        // Step 6: Get shipping addresses
        const shippingAddressIds = ordersData
          .filter(order => order.shipping_address_id)
          .map(order => order.shipping_address_id);

        let shippingAddressesData = [];
        if (shippingAddressIds.length > 0) {
          

          const { data: addresses, error: addressError } = await supabase
            .from('shipping_addresses')
            .select('*')
            .in('id', shippingAddressIds);

          if (addressError) {
            
            throw addressError;
          }
          shippingAddressesData = addresses || [];
          
        }

        // Step 7: Combine all data
        const combinedOrders = ordersData.map(order => {
          // Find customer profile
          const profile = profilesData?.find(p => p.id === order.user_id) || null;
          
          // Find order items for this order
          const orderItems = orderItemsData?.filter(item => item.order_id === order.id) || [];
          
          // Add product data to order items
          const orderItemsWithProducts = orderItems.map(item => {
            const product = productsData.find(p => p.id === item.product_id);
            return {
              ...item,
              products: product || null
            };
          });
          
          // Find shipping address
          const shippingAddress = shippingAddressesData.find(addr => addr.id === order.shipping_address_id) || null;

          const orderSummary = {
            order_id: order.id.slice(0, 8),
            customer_id: order.user_id.slice(0, 8),
            customer_name: profile?.full_name || 'Cliente no encontrado',
            customer_email: profile?.email || 'Email no disponible',
            items_count: orderItemsWithProducts.length,
            has_shipping: !!shippingAddress,
            total: order.total_amount
          };

          

          return {
            ...order,
            profiles: profile,
            order_items: orderItemsWithProducts,
            shipping_addresses: shippingAddress
          };
        });

        
        
        // Summary stats
        const ordersWithProfiles = combinedOrders.filter(o => o.profiles).length;
        const ordersWithItems = combinedOrders.filter(o => o.order_items.length > 0).length;
        const ordersWithShipping = combinedOrders.filter(o => o.shipping_addresses).length;
        
        
        
        
        
        

        return combinedOrders as Order[];

      } catch (error) {
        
        throw error;
      }
    },
    enabled: isAuthenticated
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      
      
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select();


      if (error) {
        
        throw error;
      }

      
      return data;
    },
    onSuccess: (data, variables) => {
      
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: "Estado actualizado",
        description: `El pedido se ha marcado como "${statusLabels[variables.status as keyof typeof statusLabels]}"`,
      });
    },
    onError: (error: any, variables) => {
      
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudo actualizar el estado del pedido",
        variant: "destructive"
      });
    }
  });

  const handleStatusChange = (orderId: string, newStatus: string) => {
    
    updateOrderStatus.mutate({ orderId, status: newStatus });
  };

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-4 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <XCircle className="h-16 w-16 text-red-500 mb-6" />
            <h2 className="text-xl md:text-2xl font-semibold mb-4 text-center">Error al cargar pedidos</h2>
            <p className="mt-2 text-gray-600 max-w-md text-center text-sm md:text-base">
              Ha ocurrido un error al cargar los pedidos. Por favor, intenta nuevamente más tarde.
            </p>
            <p className="text-xs md:text-sm text-red-600 mt-2 text-center">
              Error: {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="container mx-auto py-4 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ShoppingBag className="h-16 w-16 text-gray-400 mb-6" />
              <h2 className="text-xl md:text-2xl font-semibold mb-4">No hay pedidos</h2>
              <p className="text-gray-600 mb-8 max-w-md text-sm md:text-base">
                Aún no se han realizado pedidos en la tienda.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestión de Pedidos</h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base">
            Administra todos los pedidos de la tienda ({orders.length} pedidos encontrados)
          </p>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.map((order) => {
            const StatusIcon = statusIcons[order.status];
            const isExpanded = expandedOrder === order.id;
            const isUpdating = updateOrderStatus.isPending;
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="hover:shadow-lg transition-shadow duration-200">
                  {/* Mobile-First Header */}
                  <CardHeader className="pb-3">
                    <div className="space-y-3">
                      {/* Top Row - Order ID and Status */}
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base md:text-lg">
                          #{order.id.slice(0, 8)}
                        </CardTitle>
                        <Badge className={`${statusColors[order.status]} text-xs`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusLabels[order.status]}
                        </Badge>
                      </div>
                      
                      {/* Mobile Customer Info */}
                      <div className="md:hidden space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium text-sm">{order.profiles?.full_name || 'Cliente no encontrado'}</p>
                            <p className="text-xs text-gray-600">{order.profiles?.email || 'Email no disponible'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-xs text-gray-600">
                              {new Date(order.created_at).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <span className="font-semibold text-sm">${order.total_amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select
                          value={order.status}
                          onValueChange={(status) => handleStatusChange(order.id, status)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-full sm:w-40 h-9">
                            <SelectValue placeholder="Estado del pedido" />
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
                          size="sm"
                          onClick={() => toggleOrderExpansion(order.id)}
                          className="w-full sm:w-auto"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Ver detalles
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Desktop Info Grid */}
                    <div className="hidden md:grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-sm text-gray-500 mb-1">Cliente</h4>
                        <p className="font-medium">{order.profiles?.full_name || 'Cliente no encontrado'}</p>
                        <p className="text-sm text-gray-600">{order.profiles?.email || 'Email no disponible'}</p>
                        <p className="text-xs text-gray-400">ID: {order.user_id.slice(0, 8)}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-500 mb-1">Fecha</h4>
                        <p className="text-sm">{new Date(order.created_at).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-500 mb-1">Total</h4>
                        <p className="text-lg font-semibold">${order.total_amount.toFixed(2)}</p>
                        {order.shipping_cost > 0 && (
                          <p className="text-sm text-gray-600">
                            (Incluye envío: ${order.shipping_cost.toFixed(2)})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 pt-4 border-t space-y-4"
                      >
                        {/* Products */}
                        <div>
                          <h4 className="font-medium mb-3 text-sm md:text-base">
                            Productos ({order.order_items?.length || 0})
                          </h4>
                          <div className="space-y-3">
                            {order.order_items?.length > 0 ? (
                              order.order_items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-3 py-3 border rounded-lg px-3 bg-gray-50"
                                >
                                  <div className="h-12 w-12 md:h-16 md:w-16 relative rounded overflow-hidden bg-white flex-shrink-0">
                                    <img
                                      src={getFirstImageUrl(item.products?.image_url || [])}
                                      alt={item.products?.name || 'Producto'}
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-sm md:text-base truncate">
                                      {item.products?.name || 'Producto'}
                                    </h5>
                                    <p className="text-xs md:text-sm text-gray-600">
                                      {item.quantity} × ${item.unit_price.toFixed(2)}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="font-medium text-sm md:text-base">
                                      ${(item.quantity * item.unit_price).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-500 italic text-sm">No hay productos en este pedido</p>
                            )}
                          </div>
                        </div>

                        {/* Shipping Address */}
                        <div>
                          <h4 className="font-medium mb-3 text-sm md:text-base">Dirección de Envío</h4>
                          {order.shipping_addresses ? (
                            <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                              <p className="font-medium text-sm md:text-base">{order.shipping_addresses.full_name}</p>
                              <p className="text-xs md:text-sm text-gray-600 mt-1">
                                {order.shipping_addresses.street_address}
                              </p>
                              <p className="text-xs md:text-sm text-gray-600">
                                {order.shipping_addresses.city}, {order.shipping_addresses.state} {order.shipping_addresses.postal_code}
                              </p>
                              <p className="text-xs md:text-sm text-gray-600">
                                Tel: {order.shipping_addresses.phone}
                              </p>
                            </div>
                          ) : (
                            <p className="text-gray-500 italic text-sm">No hay dirección de envío registrada</p>
                          )}
                        </div>
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