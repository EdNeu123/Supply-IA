import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/config/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, email, password); navigate('/app'); }
    catch { toast.error('Erro ao fazer login. Verifique suas credenciais.'); }
  };

  const handleGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider); navigate('/app'); }
    catch { toast.error('Erro ao fazer login com Google.'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-sm border border-border">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-accent mb-2">Supply IA</h1>
          <p className="text-text-2">Acesse sua conta para gerenciar compras.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {[{ label: 'E-mail', type: 'email', value: email, onChange: setEmail },
            { label: 'Senha', type: 'password', value: password, onChange: setPassword }].map(f => (
            <div key={f.label}>
              <label className="block text-sm font-medium text-text-1 mb-1">{f.label}</label>
              <input type={f.type} className="w-full px-4 py-2 rounded-xl border border-border bg-surface text-text-1 focus:outline-none focus:border-accent"
                value={f.value} onChange={e => f.onChange(e.target.value)} required />
            </div>
          ))}
          <button type="submit" className="w-full py-2 px-4 bg-accent text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors">Entrar</button>
        </form>
        <div className="mt-6 flex items-center gap-3">
          <span className="flex-1 border-b border-border" />
          <span className="text-xs text-text-3 uppercase">Ou continue com</span>
          <span className="flex-1 border-b border-border" />
        </div>
        <button onClick={handleGoogle} className="mt-6 w-full py-2 px-4 bg-surface-2 hover:bg-border text-text-1 rounded-xl font-medium transition-colors">Google</button>
        <p className="mt-8 text-center text-sm text-text-2">
          Não tem conta? <Link to="/cadastro" className="text-accent hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
};
