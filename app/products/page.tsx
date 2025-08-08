"use client"

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ProductGrid from '@/components/products/product-grid';
import { Product } from '@/types/product';

const ITEMS_PER_PAGE = 16;

const categories = [
  { value: 'all', label: 'Todas las categorías' },
  { value: 'clothing', label: 'Ropa' },
  { value: 'shoes', label: 'Zapatos' },
  { value: 'accessories', label: 'Accesorios' }
];

const sortOptions = [
  { value: 'featured', label: 'Destacados' },
  { value: 'price-asc', label: 'Precio: Menor a Mayor' },
  { value: 'price-desc', label: 'Precio: Mayor a Menor' },
  { value: 'newest', label: 'Más Recientes' }
];

interface Filters {
  category?: string;
  sort?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export default function CatalogPage() {
  const [filters, setFilters] = useState<Filters>({
    category: 'all',
    sort: 'featured'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    document.title = 'Sapphirus - Catálogo';
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', filters, currentPage],
    queryFn: async () => {
      let countQuery = supabase
        .from('products')
        .select('id', { count: 'exact' });

      let query = supabase
        .from('products')
        .select('*');

      // Apply filters to both queries
      if (filters.category && filters.category !== 'all') {
        countQuery = countQuery.eq('category', filters.category);
        query = query.eq('category', filters.category);
      }

      if (filters.search) {
        countQuery = countQuery.ilike('name', `%${filters.search}%`);
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters.minPrice) {
        countQuery = countQuery.gte('price', filters.minPrice);
        query = query.gte('price', filters.minPrice);
      }

      if (filters.maxPrice) {
        countQuery = countQuery.lte('price', filters.maxPrice);
        query = query.lte('price', filters.maxPrice);
      }

      // Get total count
      const { count } = await countQuery;
      setTotalItems(count || 0);

      // Apply sorting and pagination
      switch (filters.sort) {
        case 'price-asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price-desc':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      query = query
        .range(from, from + ITEMS_PER_PAGE - 1);

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    }
  });

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchQuery }));
  };

  return (
    <div className="min-h-screen bg-muted/50 pt-20">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-serif font-bold">Nuestro Catálogo</h1>
            <p className="mt-1 text-muted-foreground">
              Encuentra los mejores productos americanos
            </p>
          </div>

          <form onSubmit={handleSearch} className="w-full md:w-auto flex gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit">Buscar</Button>
          </form>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="sm:hidden">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Categoría
                  </label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Ordenar por
                  </label>
                  <Select
                    value={filters.sort}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sort: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden sm:flex gap-4">
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.sort}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sort: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ProductGrid products={products} isLoading={isLoading} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Mobile pagination - show only current, prev, next */}
              <div className="flex sm:hidden items-center gap-1">
                {currentPage > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="h-8 px-2"
                  >
                    {currentPage - 1}
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 px-2"
                >
                  {currentPage}
                </Button>
                {currentPage < totalPages && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="h-8 px-2"
                  >
                    {currentPage + 1}
                  </Button>
                )}
                {currentPage < totalPages - 1 && (
                  <span className="text-muted-foreground px-1">...</span>
                )}
                {currentPage < totalPages - 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-8 px-2"
                  >
                    {totalPages}
                  </Button>
                )}
              </div>

              {/* Desktop pagination - show all pages */}
              <div className="hidden sm:flex items-center gap-2">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 7) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 4) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNumber = totalPages - 6 + i;
                  } else {
                    pageNumber = currentPage - 3 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="icon"
                      onClick={() => setCurrentPage(pageNumber)}
                      className="h-10 w-10"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {/* Page info for mobile */}
            <div className="sm:hidden ml-2 text-sm text-muted-foreground">
              {currentPage} de {totalPages}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}