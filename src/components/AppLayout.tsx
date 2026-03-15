import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Outlet, useNavigate } from 'react-router-dom';
import { Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function AppLayout() {
  const [search, setSearch] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('avatar_url').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    });
  }, [user]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/ordens?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    // If already on orders page, update URL param live
    if (window.location.pathname === '/ordens') {
      const url = new URL(window.location.href);
      if (val.trim()) url.searchParams.set('q', val.trim());
      else url.searchParams.delete('q');
      window.history.replaceState({}, '', url.toString());
      // Dispatch custom event for OrdersPage to pick up
      window.dispatchEvent(new CustomEvent('global-search', { detail: val }));
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-4 px-4" style={{ boxShadow: 'inset 0 -1px 0 0 rgba(255,255,255,0.08)' }}>
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <Input
                placeholder="Buscar por OS, cliente, aparelho..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                onKeyDown={handleSearch}
                className="pl-9 h-9 bg-surface-1 border-0 text-sm placeholder:text-muted-foreground"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
              />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center overflow-hidden cursor-pointer" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }} onClick={() => navigate('/configuracoes')}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
