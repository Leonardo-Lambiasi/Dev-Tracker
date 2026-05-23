import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

export default function FocoProjetos() {
  const [projetos, setProjetos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [proximoPasso, setProximoPasso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    api.listarProjetos()
      .then(data => setProjetos((data ?? []).filter(p => p.status === 'em andamento')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editandoId) inputRef.current?.focus();
  }, [editandoId]);

  useEffect(() => {
    if (!editandoId) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        cancelar();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [editandoId]);

  function iniciarEditar(projeto) {
    setEditandoId(projeto.id);
    setProximoPasso(projeto.proximoPasso ?? '');
  }

  function cancelar() {
    setEditandoId(null);
    setProximoPasso('');
  }

  async function salvar(projeto) {
    if (salvando) return;
    setSalvando(true);
    try {
      const atualizado = await api.atualizarProjeto(projeto.id, {
        ...projeto,
        proximoPasso: proximoPasso.trim() || null,
      });
      setProjetos(prev => prev.map(p => p.id === projeto.id ? atualizado : p));
      cancelar();
    } catch {
      // silencioso
    } finally {
      setSalvando(false);
    }
  }

  if (projetos.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h2 className="section-title">Em andamento</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projetos.map(p => {
          const editando = editandoId === p.id;
          return (
            <div key={p.id} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.nome}</div>

                  {editando ? (
                    <div ref={containerRef} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        ref={inputRef}
                        value={proximoPasso}
                        onChange={e => setProximoPasso(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') salvar(p); if (e.key === 'Escape') cancelar(); }}
                        style={{ flex: 1, fontSize: 13 }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}
                        onClick={() => salvar(p)}
                        disabled={salvando}
                      >
                        {salvando ? '...' : 'Salvar'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => iniciarEditar(p)}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        fontSize: 13, textAlign: 'left', display: 'block',
                        color: p.proximoPasso ? '#cbd5e1' : 'var(--accent)',
                      }}
                    >
                      {p.proximoPasso || '+ Definir próximo passo'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{p.percentual}%</div>
                    <div className="progress-bar" style={{ width: 60, marginTop: 4 }}>
                      <div className="progress-fill" style={{ width: `${p.percentual}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
