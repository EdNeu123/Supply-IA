import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Login } from '@/pages/Login';
import { Cadastro } from '@/pages/Cadastro';
import { Landing } from '@/pages/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { Produtos } from '@/pages/Produtos';
import { Fornecedores } from '@/pages/Fornecedores';
import { Cotacoes } from '@/pages/Cotacoes';
import { Compras } from '@/pages/Compras';
import { useAuthStore } from '@/store/authStore';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <div className="h-screen flex items-center justify-center bg-bg text-text-2">Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/cadastro" element={<Cadastro />} />
    <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route index element={<Dashboard />} />
      <Route path="produtos" element={<Produtos />} />
      <Route path="fornecedores" element={<Fornecedores />} />
      <Route path="cotacoes" element={<Cotacoes />} />
      <Route path="compras" element={<Compras />} />
    </Route>
  </Routes>
);
