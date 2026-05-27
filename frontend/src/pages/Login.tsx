import { auth, googleProvider } from '@/config/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Package, Zap, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const INPUT_CLASS =
  'w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm ' +
  'placeholder:text-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ' +
  'outline-none transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

const features = [
  { icon: Package,      text: 'Estoque monitorado em tempo real' },
  { icon: Zap,          text: 'Cotações automáticas via Telegram' },
  { icon: BrainCircuit, text: 'IA interpreta respostas dos fornecedores' },
  { icon: CheckCircle2, text: 'Aprovação em 1 clique com comparativo' },
];

const ERROR_MESSAGES: Record<string, string> = {
  'auth/user-not-found':    'Usuário não encontrado.',
  'auth/wrong-password':    'Senha incorreta.',
  'auth/invalid-credential':'E-mail ou senha inválidos.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento.',
  'auth/user-disabled':     'Esta conta foi desativada.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
};

export const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/app');
    } catch (err: any) {
      toast.error(ERROR_MESSAGES[err.code] ?? 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/app');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error('Erro ao entrar com Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Painel esquerdo (visual / branding) ── */}
      <aside
        className="hidden lg:flex lg:w-5/12 bg-teal-600 flex-col justify-center p-14 relative overflow-hidden"
        aria-hidden="true"
      >
        {/* Decoração de fundo */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500 rounded-full -translate-y-1/2 translate-x-1/2 opacity-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-52 h-52 bg-teal-700 rounded-full translate-y-1/2 -translate-x-1/2 opacity-40 pointer-events-none" />

        <div className="relative z-10 space-y-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <img src="/logo-icon.png" alt="" className="h-6 w-6 object-contain brightness-200" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Supply IA</span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-white leading-snug">
              Bem-vindo de volta!
            </h2>
            <p className="text-teal-100 leading-relaxed text-sm">
              Seu estoque te esperando. Continue de onde parou e mantenha suas compras no piloto automático.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-white" />
                </div>
                <span className="text-teal-100 text-sm">{text}</span>
              </li>
            ))}
          </ul>

          {/* Rodapé do painel */}
          <p className="text-teal-300 text-xs pt-2 border-t border-white/10">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-white font-semibold hover:underline underline-offset-2">
              Crie grátis
            </Link>
          </p>
        </div>
      </aside>

      {/* ── Painel direito (formulário) ── */}
      <main className="flex-1 flex items-center justify-center p-6 relative">

        {/* Botão voltar */}
        <Link
          to="/"
          className="absolute top-6 left-6 sm:top-8 sm:left-8 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors rounded-lg px-2 py-1 hover:bg-gray-100"
          aria-label="Voltar para a página inicial"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <img
              src="/logo-icon.png"
              alt=""
              className="h-8 w-8 object-contain"
              style={{ mixBlendMode: 'multiply' }}
            />
            <span className="text-lg font-bold text-gray-900">
              Supply <span className="text-teal-600">IA</span>
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

            {/* Cabeçalho */}
            <header className="mb-7">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Entrar na sua conta</h1>
              <p className="text-gray-500 text-sm">Gerencie seu estoque com inteligência.</p>
            </header>

            {/* OAuth Google */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              type="button"
              className="w-full py-2.5 px-4 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm font-medium flex items-center justify-center gap-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-5 shadow-sm focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
            >
              <GoogleIcon />
              Continuar com Google
            </button>

            {/* Divisor */}
            <div className="flex items-center gap-3 mb-5" role="separator">
              <span className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">ou com e-mail</span>
              <span className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Formulário */}
            <form onSubmit={handleLogin} noValidate className="space-y-4">

              {/* E-mail */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-700">
                    Senha
                  </label>
                  {/* Espaço reservado para "Esqueci a senha" no futuro */}
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Sua senha"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    className={`${INPUT_CLASS} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500 rounded"
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full py-3 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 active:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:outline-none mt-1"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  'Entrar →'
                )}
              </button>
            </form>

            {/* Footer do card */}
            <p className="mt-6 text-center text-sm text-gray-500">
              Não tem conta?{' '}
              <Link to="/cadastro" className="text-teal-600 font-semibold hover:underline underline-offset-2">
                Criar conta grátis
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
