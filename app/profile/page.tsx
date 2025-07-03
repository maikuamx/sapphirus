/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Camera, MapPin } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getCloudinaryUploadWidget } from '@/lib/cloudinary';
import { requireAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import ShippingAddressForm from '@/components/shipping/shipping-address-form';
import ShippingAddressSelector from '@/components/shipping/shipping-address-selector';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    requireAuth();
    document.title = 'Sapphirus - Mi Perfil';
  }, []);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    }
  });

  const updateProfile = useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', profile?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado correctamente",
      });
    }
  });

  const handleAvatarUpload = async () => {
    try {
      const imageUrl = await getCloudinaryUploadWidget();
      if (imageUrl) {
        await updateProfile.mutateAsync({ avatar_url: imageUrl });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await updateProfile.mutateAsync({
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
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
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Mi Perfil</TabsTrigger>
              <TabsTrigger value="addresses">Direcciones</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Información Personal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-muted">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-full h-full p-6 text-muted-foreground" />
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute bottom-0 right-0 rounded-full"
                        onClick={handleAvatarUpload}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Nombre completo
                      </label>
                      <Input
                        name="full_name"
                        defaultValue={profile?.full_name}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Correo electrónico
                      </label>
                      <Input
                        name="email"
                        type="email"
                        defaultValue={profile?.email}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="flex justify-end gap-4">
                      {isEditing ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit">
                            Guardar cambios
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => setIsEditing(true)}
                        >
                          Editar perfil
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="addresses">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Mis Direcciones de Envío
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {showAddressForm ? (
                    <ShippingAddressForm
                      onSuccess={() => setShowAddressForm(false)}
                      onCancel={() => setShowAddressForm(false)}
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={() => setShowAddressForm(true)}>
                          Agregar Nueva Dirección
                        </Button>
                      </div>
                      <ShippingAddressSelector
                        onAddressSelect={() => {}}
                        onShippingCostChange={() => {}}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}