
import React, { useState } from 'react';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email || !password) {
      setError('DIGITE E-MAIL E SENHA.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setSuccess('CONTA CRIADA! AGORA FAÇA O LOGIN COM ELA.');
        setIsSignUp(false);
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        if (data.user) onLogin(data.user.email || '');
      }
    } catch (err: any) {
      console.error('Erro Auth:', err);
      let message = 'E-MAIL OU SENHA INCORRETOS.';
      if (err.message.includes('Invalid login credentials')) {
        message = 'ACESSO NEGADO: E-MAIL OU SENHA ERRADOS.';
      } else if (err.message.includes('already registered')) {
        message = 'ESTE E-MAIL JÁ ESTÁ CADASTRADO.';
      } else {
        message = err.message.toUpperCase();
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-tsunami">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo className="w-32 h-32 md:w-40 md:h-40" />
        </div>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-center text-white uppercase italic mb-8">
              {isSignUp ? 'Criar Conta' : 'Entrar'}
            </h2>

            {success && <p className="mb-4 text-green-400 font-black text-center text-[10px] uppercase">{success}</p>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-MAIL"
                className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-white font-bold outline-none focus:border-blue-500"
              />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="SENHA"
                className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-white font-bold outline-none focus:border-blue-500"
              />

              {error && <p className="text-red-500 font-black text-center text-[10px] uppercase">{error}</p>}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl uppercase tracking-widest shadow-xl flex items-center justify-center"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isSignUp ? "Confirmar" : "Entrar")}
              </button>

              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-white/40 font-black text-[10px] uppercase tracking-widest hover:text-white"
              >
                {isSignUp ? 'Voltar para login' : 'Cadastrar novo e-mail'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
