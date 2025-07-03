"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, MapPin, Phone, User } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShippingAddressFormData } from '@/types/shipping';

interface ShippingAddressFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editingAddress?: any;
}

export default function ShippingAddressForm({ 
  onSuccess, 
  onCancel, 
  editingAddress 
}: ShippingAddressFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveAddress = useMutation({
    mutationFn: async (data: ShippingAddressFormData) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No authenticated session');

      if (editingAddress) {
        const { error } = await supabase
          .from('shipping_addresses')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAddress.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shipping_addresses')
          .insert([{
            ...data,
            user_id: session.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-addresses'] });
      toast({
        title: "Éxito",
        description: editingAddress 
          ? "Dirección actualizada exitosamente"
          : "Dirección agregada exitosamente",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const form = e.currentTarget;
      const formData = new FormData(form);

      const addressData: ShippingAddressFormData = {
        full_name: formData.get('full_name') as string,
        phone: formData.get('phone') as string,
        street_address: formData.get('street_address') as string,
        city: formData.get('city') as string,
        state: formData.get('state') as string,
        postal_code: formData.get('postal_code') as string,
        is_default: formData.get('is_default') === 'on'
      };

      await saveAddress.mutateAsync(addressData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {editingAddress ? 'Editar Dirección' : 'Nueva Dirección de Envío'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Nombre completo
              </label>
              <Input
                type="text"
                name="full_name"
                required
                defaultValue={editingAddress?.full_name}
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                Teléfono
              </label>
              <Input
                type="tel"
                name="phone"
                required
                defaultValue={editingAddress?.phone}
                placeholder="614-123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Dirección completa
            </label>
            <Textarea
              name="street_address"
              required
              defaultValue={editingAddress?.street_address}
              placeholder="Calle, número, colonia, referencias"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Ciudad
              </label>
              <Input
                type="text"
                name="city"
                required
                defaultValue={editingAddress?.city}
                placeholder="Chihuahua"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Estado
              </label>
              <Input
                type="text"
                name="state"
                required
                defaultValue={editingAddress?.state}
                placeholder="Chihuahua"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Envío dentro de Chihuahua: $120 | Otros estados: $200
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Código Postal
              </label>
              <Input
                type="text"
                name="postal_code"
                required
                defaultValue={editingAddress?.postal_code}
                placeholder="31000"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="is_default" 
              name="is_default"
              defaultChecked={editingAddress?.is_default}
            />
            <label htmlFor="is_default" className="text-sm">
              Establecer como dirección predeterminada
            </label>
          </div>

          <div className="flex justify-end gap-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                  Guardando...
                </>
              ) : (
                editingAddress ? 'Actualizar Dirección' : 'Guardar Dirección'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}