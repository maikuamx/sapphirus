/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/product';

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, cart } = useCartStore();
  const { toast } = useToast();
  const router = useRouter();

  // Query to get user session and role
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      return {
        session,
        role: data?.role
      };
    }
  });

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);
        
        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

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

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault(); // Prevent navigation when clicking the button
    e.stopPropagation(); // Stop event bubbling

    if (!session?.session) {
      router.push('/auth');
      return;
    }

    // Check current cart quantity for this product
    const currentCartItem = cart.items.find(item => item.productId === product.id);
    const currentQuantity = currentCartItem?.quantity || 0;
    const totalQuantity = currentQuantity + 1;

    if (totalQuantity > product.stock) {
      toast({
        title: "Error",
        description: `No puedes agregar más de ${product.stock} unidades de este producto`,
        variant: "destructive"
      });
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: getFirstImageUrl(product.image_url),
    });

    toast({
      title: "Producto agregado",
      description: `${product.name} se ha agregado al carrito`,
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  if (loading) {
    return (
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-serif font-bold text-center mb-12"
          >
            Productos Destacados
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-serif font-bold text-center mb-12"
        >
          Productos Destacados
        </motion.h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {products.map((product) => (
            <motion.div
              key={product.id}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className="h-full"
            >
              <Card className="h-full overflow-hidden">
                <motion.div 
                  className="aspect-square overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src={getFirstImageUrl(product.image_url)}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </motion.div>
                <CardHeader>
                  <CardTitle className="line-clamp-1">{product.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-lg font-semibold">
                      ${product.price.toFixed(2)}
                    </p>
                    <span className="text-sm text-muted-foreground">
                      Talla: {product.size || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    {product.stock > 0 ? (
                      <span className="text-sm text-green-600 dark:text-green-400">
                        {product.stock} disponibles
                      </span>
                    ) : (
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Agotado
                      </span>
                    )}
                  </div>
                </CardContent>
                {session?.role !== 'admin' && (
                  <CardFooter>
                    <Button 
                      className="w-full"
                      disabled={product.stock === 0}
                      onClick={(e) => handleAddToCart(e, product)}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {!session?.session ? 'Iniciar Sesión para Comprar' : 'Agregar al Carrito'}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}