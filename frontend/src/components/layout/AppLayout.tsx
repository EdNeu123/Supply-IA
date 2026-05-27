import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Truck, FileText, ShoppingCart, LogOut, Moon, Sun, Link2, ArrowLeftRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/app':              'Dashboard',
  '/app/produtos':     'Produtos',
  '/app/fornecedores': 'Fornecedores',
  '/app/vinculos':     'Vínculos',
  '/app/movimentacoes': 'Movimentações',
  '/app/cotacoes':     'Cotações',
  '/app/compras':      'Compras',
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
    { path: '/app/vinculos',     icon: Link2,           label: 'Vínculos' },
    { path: '/app/movimentacoes', icon: ArrowLeftRight,  label: 'Movimentações' },
    { path: '/app/cotacoes',     icon: FileText,        label: 'Cotações' },
    { path: '/app/compras',      icon: ShoppingCart,    label: 'Compras' },
  ];

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Supply IA';

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="w-64 bg-surface border-r border-border flex flex-col">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
          <div className="w-8 h-8 bg-accent-bg rounded-lg flex items-center justify-center shrink-0">
            <img src="/logo-icon.png" alt="" className="h-5 w-5 object-contain" style={{ mixBlendMode: 'multiply' }} />
          </div>
          <span className="text-lg font-bold text-text-1">Supply <span className="text-accent">IA</span></span>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-0.5 px-3">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm font-medium ${
                  active ? 'bg-accent-bg text-accent' : 'text-text-2 hover:bg-surface-2 hover:text-text-1'
                }`}>
                <Icon size={17} />{label}
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
            <LogOut size={17} />Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-8">
          <h1 className="text-lg font-semibold text-text-1">{pageTitle}</h1>
          <button onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full hover:bg-surface-2 text-text-2 transition-colors">
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </header>
        <div className="flex-1 overflow-auto p-8"><Outlet /></div>
      </main>
    </div>
  );
};
