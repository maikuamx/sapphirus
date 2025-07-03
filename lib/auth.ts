  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  export const supabase = createClient(supabaseUrl, supabaseAnonKey);

  export async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Get user profile with role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      return {
        session,
        role: profile?.role
      };
    } catch (error) {
      
      return null;
    }
  }

  export async function requireAuth(requiredRole?: 'admin' | 'client') {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/auth';
        return null;
      }

      // Get user profile with role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        await supabase.auth.signOut();
        window.location.href = '/auth';
        return null;
      }

      // If no specific role is required, just check for authentication
      if (!requiredRole) {
        return { session, role: profile.role };
      }

      // If a specific role is required, check if the user has that role
      if (profile.role !== requiredRole) {
        window.location.href = '/';
        return null;
      }

      return { session, role: profile.role };
    } catch (error) {
      
      await supabase.auth.signOut();
      window.location.href = '/auth';
      return null;
    }
  }