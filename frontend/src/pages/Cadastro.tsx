import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '@/config/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Mail, Lock, Building2, CheckCircle2 } from 'lucide-react';

export const Cadastro = () => {
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('As senhas não coincidem.');
    if (form.password.length < 6) return toast.error('Senha deve ter pelo menos 6 caracteres.');
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(user, { displayName: form.name });
      toast.success('Conta criada! Bem-vindo ao Supply IA 🎉');
      navigate('/app');
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/email-already-in-use': 'Este e-mail já está em uso.',
        'auth/invalid-email': 'E-mail inválido.',
        'auth/weak-password': 'Senha muito fraca.',
      };
      toast.error(msg[err.code] ?? 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Bem-vindo ao Supply IA!');
      navigate('/app');
    } catch {
      toast.error('Erro ao entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-teal-600 flex-col justify-center p-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-700 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-12">
            <img src="/logo-icon.png" alt="" className="h-9 w-9 object-contain brightness-200" />
            <span className="text-2xl font-bold text-white">Supply IA</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight">
            Automatize suas compras.<br />Nunca mais perca uma venda.
          </h2>
          <p className="text-teal-100 mb-10 leading-relaxed">
            Controle de estoque inteligente com cotação automática via Telegram e IA que interpreta respostas dos fornecedores.
          </p>
          <div className="space-y-3">
            {[
              'Alertas automáticos de ponto de pedido',
              'Cotações disparadas via Telegram',
              'IA que lê respostas em texto livre',
              'Comparativo ranqueado em 1 clique',
            ].map(t => (
              <div key={t} className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-teal-300 shrink-0" />
                <span className="text-teal-100 text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain" style={{ mixBlendMode: 'multiply' }} />
            <span className="text-lg font-bold text-gray-900">Supply <span className="text-teal-600">IA</span></span>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Crie sua conta grátis</h1>
            <p className="text-gray-500 text-sm">Sem cartão de crédito. Cancele quando quiser.</p>
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading}
            className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50 mb-5 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <span className="flex-1 border-b border-gray-200" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">ou com e-mail</span>
            <span className="flex-1 border-b border-gray-200" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome completo</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" required placeholder="João Silva"
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 text-sm focus:border-teal-500 outline-none bg-gray-50 focus:bg-white transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Empresa <span className="text-gray-400 font-normal">(opcional)</span></label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Minha Loja"
                    value={form.company} onChange={e => setForm({...form, company: e.target.value})}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 text-sm focus:border-teal-500 outline-none bg-gray-50 focus:bg-white transition-colors" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" required placeholder="joao@empresa.com"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 text-sm focus:border-teal-500 outline-none bg-gray-50 focus:bg-white transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPass ? 'text' : 'password'} required placeholder="Mín. 6 caracteres"
                    value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-gray-200 text-gray-900 text-sm focus:border-teal-500 outline-none bg-gray-50 focus:bg-white transition-colors" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirmar senha</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPass ? 'text' : 'password'} required placeholder="Repita a senha"
                    value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 text-sm focus:border-teal-500 outline-none bg-gray-50 focus:bg-white transition-colors" />
                </div>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 mt-1">
              {loading ? 'Criando conta...' : 'Criar conta grátis →'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-teal-600 font-semibold hover:underline">Faça login</Link>
          </p>
          <p className="mt-3 text-center text-xs text-gray-400">
            Ao criar sua conta, você concorda com os{' '}
            <span className="text-teal-600 cursor-pointer hover:underline">Termos de Uso</span>
            {' '}e a{' '}
            <span className="text-teal-600 cursor-pointer hover:underline">Política de Privacidade</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
