import { auth, googleProvider } from '@/config/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/app');
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/invalid-credential': 'E-mail ou senha inválidos.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento.',
      };
      toast.error(msg[err.code] ?? 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/app');
    } catch {
      toast.error('Erro ao entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-accent flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-white blur-3xl" />
        </div>
        <img src="/logo.png" alt="Supply IA" className="h-16 object-contain mb-8 relative z-10 brightness-200" />
        <div className="relative z-10 text-center text-white space-y-4 max-w-sm">
          <h2 className="text-3xl font-bold">Bem-vindo de volta!</h2>
          <p className="text-white/80">Seu estoque te esperando. Continue de onde parou.</p>
          <div className="mt-8 p-4 bg-white/10 rounded-2xl text-left">
            <p className="text-white/60 text-xs uppercase font-semibold mb-3">O que você pode fazer hoje</p>
            {[
              '📦 Ver estoque em tempo real',
              '📨 Disparar cotações automáticas',
              '🤖 IA interpreta respostas',
              '✅ Aprovar compras em 1 clique',
            ].map(t => <p key={t} className="text-white/90 text-sm py-1">{t}</p>)}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        
        {/* Botão de Voltar */}
        <Link
          to="/"
          className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-2 text-sm font-medium text-text-2 hover:text-text-1 transition-colors"
        >
          <ArrowLeft size={18} />
          Voltar
        </Link>

        <div className="w-full max-w-sm mt-8 lg:mt-0">
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/logo.png" alt="Supply IA" className="h-10 object-contain" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-1 mb-1">Entrar na sua conta</h1>
            <p className="text-text-2 text-sm">Gerencie seu estoque com inteligência.</p>
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading}
            className="w-full py-3 px-4 bg-surface border border-border rounded-xl text-text-1 font-medium flex items-center justify-center gap-3 hover:bg-surface-2 transition-colors disabled:opacity-50 mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <span className="flex-1 border-b border-border" />
            <span className="text-xs text-text-3 uppercase">ou com e-mail</span>
            <span className="flex-1 border-b border-border" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-1 mb-1">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
                <input type="email" required placeholder="seu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-text-1 focus:border-accent outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-1 mb-1">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
                <input type={showPass ? 'text' : 'password'} required placeholder="Sua senha"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-border bg-surface text-text-1 focus:border-accent outline-none text-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-accent text-white rounded-xl font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50">
              {loading ? 'Entrando...' : 'Entrar →'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-2">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-accent font-medium hover:underline">Criar conta grátis</Link>
          </p>
        </div>
      </div>
    </div>
  );
};