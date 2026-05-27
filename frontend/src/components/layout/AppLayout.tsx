import { auth } from '@/config/firebase';
import { useAuthStore } from '@/store/authStore';
import { signOut } from 'firebase/auth';
import { FileText, LayoutDashboard, LogOut, Moon, Package, ShoppingCart, Sun, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

const PAGE_TITLES: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/produtos': 'Produtos',
  '/app/fornecedores': 'Fornecedores',
  '/app/cotacoes': 'Cotações',
  '/app/compras': 'Compras',
};

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  const navItems = [
    { path: '/app',              icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/app/produtos',     icon: Package,         label: 'Produtos' },
    { path: '/app/fornecedores', icon: Truck,           label: 'Fornecedores' },
    { path: '/app/cotacoes',     icon: FileText,        label: 'Cotações' },
    { path: '/app/compras',      icon: ShoppingCart,    label: 'Compras' },
  ];

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Supply IA';

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="w-64 bg-surface border-r border-border flex flex-col">
        {/* Logo ajustada (maior e sem gambiarra de CSS) */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-border">
          <img src="/logo-icon.png" alt="Logo" className="h-10 w-auto object-contain" />
          <span className="text-xl font-bold text-text-1">
            Supply <span className="text-accent">IA</span>
          </span>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm font-medium ${
                  active ? 'bg-accent-bg text-accent' : 'text-text-2 hover:bg-surface-2 hover:text-text-1'
                }`}>
                <Icon size={18} />{label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.displayName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <p className="text-xs text-text-2 truncate flex-1">{user?.displayName ?? user?.email}</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-text-2 hover:bg-red-bg hover:text-danger rounded-xl transition-colors text-sm">
            <LogOut size={18} />Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-8">
          <h1 className="text-lg font-semibold text-text-1">{pageTitle}</h1>
          <button onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full hover:bg-surface-2 text-text-2 transition-colors">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>
        <div className="flex-1 overflow-auto p-8"><Outlet /></div>
      </main>
    </div>
  );
};