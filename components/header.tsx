"use client"

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Menu, User, LogOut, Home, ShoppingBag, Package, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import CartSheet from '@/components/cart/cart-sheet';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserProfile {
  role: 'admin' | 'client';
}

export default function Header() {
  const { setTheme } = useTheme();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkUser();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      if (session) {
        await fetchUserProfile(session.user.id);
      }
    } catch (error) {
      
    }
  }

  async function fetchUserProfile(userId: string) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      setUserProfile(profile);
    } catch (error) {
      
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUserProfile(null);
      setIsMobileMenuOpen(false);
      router.push('/');
    } catch (error) {
      
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <img 
            src="/logo-black.png" 
            alt="Logo" 
            className="h-8 w-auto dark:invert"
          />
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-sm font-medium hover:text-primary">
            Inicio
          </Link>
          <Link href="/products" className="text-sm font-medium hover:text-primary">
            Catálogo
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isAuthenticated && userProfile?.role === 'client' && (
            <div className="hidden md:block">
              <CartSheet />
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Menú</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigation('/')}
                >
                  <Home className="mr-2 h-5 w-5" />
                  Inicio
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigation('/products')}
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Catálogo
                </Button>

                {isAuthenticated ? (
                  <>
                    {userProfile?.role === 'admin' ? (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation('/dashboard')}
                      >
                        <LayoutDashboard className="mr-2 h-5 w-5" />
                        Dashboard
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleNavigation('/profile')}
                        >
                          <User className="mr-2 h-5 w-5" />
                          Mi Perfil
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleNavigation('/orders')}
                        >
                          <Package className="mr-2 h-5 w-5" />
                          Mis Pedidos
                        </Button>
                        <div className="md:hidden">
                          <CartSheet />
                        </div>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-600"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-5 w-5" />
                      Cerrar Sesión
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => handleNavigation('/auth')}
                  >
                    <User className="mr-2 h-5 w-5" />
                    Iniciar Sesión
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Profile Menu */}
          {isAuthenticated ? (
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {userProfile?.role === 'admin' ? (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/profile">Mi Perfil</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/orders">Mis Pedidos</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden md:block">
              <Link href="/auth">
                <Button variant="default">Iniciar Sesión</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}