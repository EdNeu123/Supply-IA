import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

export const Cadastro = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createUserWithEmailAndPassword(auth, email, password); navigate('/app'); }
    catch { toast.error('Erro ao criar conta. Tente novamente.'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-sm border border-border">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-accent mb-2">Criar Conta</h1>
          <p className="text-text-2">Comece a automatizar suas cotações.</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          {[{ label: 'E-mail', type: 'email', value: email, onChange: setEmail },
            { label: 'Senha', type: 'password', value: password, onChange: setPassword }].map(f => (
            <div key={f.label}>
              <label className="block text-sm font-medium text-text-1 mb-1">{f.label}</label>
              <input type={f.type} className="w-full px-4 py-2 rounded-xl border border-border bg-surface text-text-1 focus:outline-none focus:border-accent"
                value={f.value} onChange={e => f.onChange(e.target.value)} required />
            </div>
          ))}
          <button type="submit" className="w-full py-2 px-4 bg-accent text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors">Cadastrar</button>
        </form>
        <p className="mt-8 text-center text-sm text-text-2">
          Já tem conta? <Link to="/login" className="text-accent hover:underline">Faça login</Link>
        </p>
      </div>
    </div>
  );
};
