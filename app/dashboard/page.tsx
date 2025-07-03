/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, DollarSign, ShoppingBag, Package,
  Plus, Edit2, Trash2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { requireAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
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

interface Stats {
  userCount: number;
  totalRevenue: number;
  completedOrders: number;
  activeProducts: number;
  revenueData: Array<{
    date: string;
    total: number;
  }>;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  size?: string;
  image_url: string[];
  created_at: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  size?: string;
  image_url: string[];
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

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

  // Helper function to parse image URLs
  const parseImageUrls = (imageUrl: string | string[]): string[] => {
    if (!imageUrl) return [];
    
    if (typeof imageUrl === 'string') {
      try {
        const parsed = JSON.parse(imageUrl);
        return Array.isArray(parsed) ? parsed : [imageUrl];
      } catch {
        return [imageUrl];
      }
    }
    
    return Array.isArray(imageUrl) ? imageUrl : [imageUrl];
  };

  // Fetch all products for admin
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', 'admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    }
  });

  // Fetch stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status, created_at');

      
        
      const completedOrders = orders?.filter(order => order.status === 'processing') || [];
      
      const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      return {
        userCount: userCount || 0,
        totalRevenue: totalRevenue || 0,
        completedOrders: completedOrders.length,
        activeProducts: productCount || 0,
        revenueData: completedOrders.map(order => ({
          date: order.created_at,
          total: order.total_amount
        }))
      };
    }
  });

  // Add product mutation
  const addProduct = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { error } = await supabase
        .from('products')
        .insert([{
          ...data,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowProductForm(false);
      setUploadedImages([]);
      toast({
        title: "Éxito",
        description: "Producto creado exitosamente",
      });
    }
  });

  // Update product mutation
  const updateProduct = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
      const { error } = await supabase
        .from('products')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowProductForm(false);
      setEditingProduct(null);
      setUploadedImages([]);
      toast({
        title: "Éxito",
        description: "Producto actualizado exitosamente",
      });
    }
  });

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setProductToDelete(null);
      toast({
        title: "Éxito",
        description: "Producto eliminado exitosamente",
      });
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxImages = 5;

    if (uploadedImages.length + files.length > maxImages) {
      toast({
        title: "Error",
        description: `Máximo ${maxImages} imágenes permitidas`,
        variant: "destructive"
      });
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Solo se permiten archivos de imagen",
          variant: "destructive"
        });
        continue;
      }

      try {
        const imageUrl = await uploadToCloudinary(file);
        setUploadedImages(prev => [...prev, imageUrl]);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Error al subir la imagen",
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const form = e.currentTarget;
      const formData = new FormData(form);

      const productData: ProductFormData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        price: parseFloat(formData.get('price') as string),
        category: formData.get('category') as string,
        stock: parseInt(formData.get('stock') as string),
        size: formData.get('size') as string || undefined,
        image_url: uploadedImages
      };

      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data: productData });
      } else {
        await addProduct.mutateAsync(productData);
      }
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

  useEffect(() => {
    requireAuth('admin');
    document.title = 'Sapphirus - Panel de Administración';
  }, []);

  useEffect(() => {
    if (editingProduct) {
      setUploadedImages(parseImageUrls(editingProduct.image_url));
    }
  }, [editingProduct]);

  if (isLoadingStats || isLoadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="mt-2 text-muted-foreground">
            {new Date().toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Usuarios Totales</h3>
                  <p className="text-2xl font-semibold">{stats?.userCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Ingresos Totales</h3>
                  <p className="text-2xl font-semibold">
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN'
                    }).format(stats?.totalRevenue || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Pedidos Completados</h3>
                  <p className="text-2xl font-semibold">{stats?.completedOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Productos Activos</h3>
                  <p className="text-2xl font-semibold">{stats?.activeProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Products Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium">Gestión de Productos</h2>
                <Button
                  onClick={() => {
                    setEditingProduct(null);
                    setShowProductForm(true);
                    setUploadedImages([]);
                  }}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Nuevo Producto
                </Button>
              </div>

              {showProductForm && (
                <form onSubmit={handleSubmit} className="mb-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nombre del Producto
                      </label>
                      <Input
                        type="text"
                        name="name"
                        required
                        defaultValue={editingProduct?.name}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Categoría
                      </label>
                      <select
                        name="category"
                        required
                        defaultValue={editingProduct?.category}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                      >
                        <option value="">Seleccionar categoría</option>
                        <option value="clothing">Ropa</option>
                        <option value="shoes">Zapatos</option>
                        <option value="accessories">Accesorios</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Precio
                      </label>
                      <Input
                        type="number"
                        name="price"
                        step="0.01"
                        required
                        defaultValue={editingProduct?.price}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Stock
                      </label>
                      <Input
                        type="number"
                        name="stock"
                        min="0"
                        required
                        defaultValue={editingProduct?.stock}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Talla (Opcional)
                      </label>
                      <Input
                        type="text"
                        name="size"
                        defaultValue={editingProduct?.size}
                        placeholder="Ej: S, M, L, XL, 42, etc."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Descripción
                    </label>
                    <Textarea
                      name="description"
                      rows={3}
                      required
                      defaultValue={editingProduct?.description}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Imágenes del Producto (Máximo 5)
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                      {uploadedImages.map((image, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                          <img
                            src={image}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-gray-100"
                          >
                            <Trash2 className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                      ))}
                      {uploadedImages.length < 5 && (
                        <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload"
                          />
                          <label
                            htmlFor="image-upload"
                            className="cursor-pointer text-center p-4"
                          >
                            <Plus className="mx-auto h-8 w-8 text-muted-foreground" />
                            <span className="mt-2 block text-sm font-medium text-muted-foreground">
                              Agregar imagen
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowProductForm(false);
                        setEditingProduct(null);
                        setUploadedImages([]);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || uploadedImages.length === 0}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                          Guardando...
                        </>
                      ) : (
                        editingProduct ? 'Actualizar Producto' : 'Guardar Producto'
                      )}
                    </Button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products?.map(product => (
                  <Card key={product.id} className="overflow-hidden">
                    <div className="aspect-square relative">
                      <img
                        src={getFirstImageUrl(product.image_url)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="text-lg font-medium">{product.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-lg font-semibold">
                          ${product.price.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Stock: {product.stock}
                        </span>
                      </div>
                      {product.size && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Talla: {product.size}
                        </p>
                      )}
                      <div className="mt-4 flex justify-between items-center">
                        <span className={`text-sm ${
                          product.stock > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {product.stock > 0 ? 'En stock' : 'Agotado'}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingProduct(product);
                              setShowProductForm(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setProductToDelete(product)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El producto será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setProductToDelete(null)}>
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (productToDelete) {
                                      deleteProduct.mutate(productToDelete.id);
                                    }
                                  }}
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
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}