"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus, Edit2, Trash2, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShippingAddress, calculateShippingCost } from '@/types/shipping';
import ShippingAddressForm from './shipping-address-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ShippingAddressSelectorProps {
  selectedAddressId?: string;
  onAddressSelect: (address: ShippingAddress) => void;
  onShippingCostChange: (cost: number) => void;
}

export default function ShippingAddressSelector({ 
  selectedAddressId, 
  onAddressSelect,
  onShippingCostChange 
}: ShippingAddressSelectorProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['shipping-addresses'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ShippingAddress[];
    }
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shipping_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-addresses'] });
      toast({
        title: "Éxito",
        description: "Dirección eliminada exitosamente",
      });
    }
  });

  const handleAddressSelect = (address: ShippingAddress) => {
    onAddressSelect(address);
    const shippingCost = calculateShippingCost(address.state);
    onShippingCostChange(shippingCost);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  const handleEdit = (address: ShippingAddress) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (showForm) {
    return (
      <ShippingAddressForm
        editingAddress={editingAddress}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setShowForm(false);
          setEditingAddress(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Seleccionar Dirección de Envío</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Dirección
        </Button>
      </div>

      {!addresses?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tienes direcciones guardadas</h3>
            <p className="text-muted-foreground mb-6 text-center">
              Agrega una dirección de envío para continuar con tu pedido
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primera Dirección
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => {
            const isSelected = selectedAddressId === address.id;
            const shippingCost = calculateShippingCost(address.state);
            
            return (
              <motion.div
                key={address.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Card 
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleAddressSelect(address)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{address.full_name}</h4>
                          {address.is_default && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                              Predeterminada
                            </span>
                          )}
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-1">
                          {address.street_address}
                        </p>
                        <p className="text-sm text-muted-foreground mb-1">
                          {address.city}, {address.state} {address.postal_code}
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          Tel: {address.phone}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-primary">
                            Costo de envío: ${shippingCost}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(address);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar dirección?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. La dirección será eliminada permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteAddress.mutate(address.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}