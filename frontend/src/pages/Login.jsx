import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!usuario.trim() || !senha) { setErro('Preencha usuário e senha.'); return; }
    setLoading(true);
    setErro('');
    try {
      const data = await api.login(usuario.trim(), senha);
      login(data.token, data.usuario);
      navigate('/');
    } catch {
      setErro('Usuário ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0a0c10',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: '36px 32px' }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Dev Tracker</div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 28 }}>Entre para acessar o tracker</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label>Usuário</label>
            <input
              autoFocus
              value={usuario}
              onChange={e => { setUsuario(e.target.value); setErro(''); }}
              placeholder="leo/rafa"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => { setSenha(e.target.value); setErro(''); }}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {erro && (
            <div style={{
              background: '#ef444420', border: '1px solid #ef444440',
              borderRadius: 8, padding: '10px 14px', marginBottom: 14,
              color: '#fca5a5', fontSize: 13,
            }}>
              {erro}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: 12, fontSize: 15, marginTop: 4 }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
