import { useEffect, useState } from 'react';
import { api } from '../services/api';

const STATUS_COLOR = {
  'em andamento': '#6366f1',
  'pausado': '#f59e0b',
  'concluído': '#10b981',
};

export default function ProjectTracker() {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(null);
  const [erroForm, setErroForm] = useState('');

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [stack, setStack] = useState('');
  const [percentual, setPercentual] = useState(0);
  const [status, setStatus] = useState('em andamento');
  const [proximoPasso, setProximoPasso] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await api.listarProjetos();
      setProjetos(data ?? []);
    } catch {
      setProjetos([]);
    } finally {
      setLoading(false);
    }
  }

  function abrirForm(projeto = null) {
    setEditando(projeto);
    setNome(projeto?.nome ?? '');
    setDescricao(projeto?.descricao ?? '');
    setStack(projeto?.stack ?? '');
    setPercentual(projeto?.percentual ?? 0);
    setStatus(projeto?.status ?? 'em andamento');
    setProximoPasso(projeto?.proximoPasso ?? '');
    setErroForm('');
    setShowForm(true);
  }

  function fecharForm() {
    setShowForm(false);
    setEditando(null);
    setErroForm('');
  }

  async function salvar() {
    if (!nome.trim()) {
      setErroForm('Nome do projeto é obrigatório.');
      return;
    }
    setSalvando(true);
    setErroForm('');
    try {
      const body = { nome: nome.trim(), descricao, stack, percentual: Number(percentual), status, proximoPasso: proximoPasso.trim() || null };
      if (editando) {
        const updated = await api.atualizarProjeto(editando.id, body);
        setProjetos(prev => prev.map(p => p.id === editando.id ? updated : p));
      } else {
        const created = await api.criarProjeto(body);
        setProjetos(prev => [...prev, created]);
      }
      fecharForm();
    } catch {
      setErroForm('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function deletar(id) {
    try {
      await api.deletarProjeto(id);
      setProjetos(prev => prev.filter(p => p.id !== id));
    } catch {
      // silencioso — botão volta ao estado normal
    } finally {
      setConfirmando(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="section-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
          Projetos pessoais
        </h2>
        {!showForm && (
          <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => abrirForm()}>
            + Novo
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16, borderColor: '#6366f140' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
            {editando ? 'Editar projeto' : 'Novo projeto'}
          </div>
          <div className="grid-2" style={{ marginBottom: 0 }}>
            <div className="field">
              <label>Nome <span style={{ color: '#ef4444' }}>*</span></label>
              <input value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div className="field">
              <label>Stack</label>
              <input value={stack} onChange={e => setStack(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Descrição</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Progresso: {percentual}%</label>
              <input
                type="range" min="0" max="100" step="5"
                value={percentual}
                onChange={e => setPercentual(e.target.value)}
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="em andamento">Em andamento</option>
                <option value="pausado">Pausado</option>
                <option value="concluído">Concluído</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Próximo passo</label>
            <input value={proximoPasso} onChange={e => setProximoPasso(e.target.value)} />
          </div>
          {erroForm && (
            <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{erroForm}</p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={fecharForm}>Cancelar</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="card" style={{ opacity: 0.4, height: 80 }} />
      )}

      {!loading && projetos.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p className="muted">Nenhum projeto cadastrado ainda.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {projetos.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{p.nome}</div>
                {p.stack && <div className="muted" style={{ marginTop: 2, fontSize: 13 }}>{p.stack}</div>}
                {p.descricao && <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>{p.descricao}</div>}
                {p.proximoPasso && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent)' }}>
                    → {p.proximoPasso}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                  background: `${STATUS_COLOR[p.status] ?? '#94a3b8'}20`,
                  color: STATUS_COLOR[p.status] ?? '#94a3b8',
                }}>
                  {p.status ?? 'em andamento'}
                </span>
                <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => abrirForm(p)}>
                  Editar
                </button>
                {confirmando === p.id ? (
                  <>
                    <button type="button" className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => deletar(p.id)}>
                      Confirmar
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setConfirmando(null)}>
                      ✕
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px', color: '#64748b' }} onClick={() => setConfirmando(p.id)}>
                    Remover
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-fill" style={{ width: `${p.percentual}%`, background: STATUS_COLOR[p.status] ?? '#6366f1' }} />
              </div>
              <span style={{ fontSize: 13, color: '#94a3b8', minWidth: 36, textAlign: 'right' }}>{p.percentual}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
