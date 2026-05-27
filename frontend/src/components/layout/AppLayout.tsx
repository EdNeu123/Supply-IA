import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Truck, FileText, ShoppingCart, LogOut, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  const navItems = [
    { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/app/produtos', icon: Package, label: 'Produtos' },
    { path: '/app/fornecedores', icon: Truck, label: 'Fornecedores' },
    { path: '/app/cotacoes', icon: FileText, label: 'Cotações' },
    { path: '/app/compras', icon: ShoppingCart, label: 'Compras' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="w-64 bg-surface border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="text-xl font-bold text-accent">Supply IA</span>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${active ? 'bg-accent-bg text-accent font-medium' : 'text-text-2 hover:bg-surface-2 hover:text-text-1'}`}>
                <Icon size={20} />{label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full text-text-2 hover:bg-red-bg hover:text-danger rounded-xl transition-colors">
            <LogOut size={20} />Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-8">
          <h1 className="text-lg font-medium text-text-1 capitalize">
            {location.pathname.split('/').pop() || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-full hover:bg-surface-2 text-text-2 transition-colors">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="w-8 h-8 rounded-full bg-accent-bg flex items-center justify-center text-accent font-medium">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8"><Outlet /></div>
      </main>
    </div>
  );
};
