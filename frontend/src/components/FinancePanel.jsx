import { useEffect, useState } from 'react';
import { api } from '../services/api';

function diasRestantes(prazo) {
  if (!prazo) return null;
  return Math.ceil((new Date(prazo) - new Date()) / (1000 * 60 * 60 * 24));
}

function fmt(val) {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FinancePanel() {
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [confirmandoDelete, setConfirmandoDelete] = useState(null);
  const [aportando, setAportando] = useState(null);
  const [aporteValor, setAporteValor] = useState('');
  const [aporteLoading, setAporteLoading] = useState(false);

  const [descricao, setDescricao] = useState('');
  const [valorMeta, setValorMeta] = useState('');
  const [valorAtual, setValorAtual] = useState('');
  const [prazo, setPrazo] = useState('');

  useEffect(() => {
    api.listarMetas()
      .then(data => setMetas(data ?? []))
      .catch(() => setMetas([]))
      .finally(() => setLoading(false));
  }, []);

  function abrirForm(meta = null) {
    setEditando(meta);
    setDescricao(meta?.descricao ?? '');
    setValorMeta(meta?.valorMeta ?? '');
    setValorAtual(meta?.valorAtual ?? '');
    setPrazo(meta?.prazo ? meta.prazo.slice(0, 10) : '');
    setErroForm('');
    setAportando(null);
    setAporteValor('');
    setConfirmandoDelete(null);
    setShowForm(true);
  }

  function fecharForm() {
    setShowForm(false);
    setEditando(null);
    setErroForm('');
  }

  async function salvar() {
    if (!descricao.trim()) { setErroForm('Descrição é obrigatória.'); return; }
    if (!valorMeta || Number(valorMeta) <= 0) { setErroForm('Informe um valor de meta maior que zero.'); return; }
    setSalvando(true);
    setErroForm('');
    try {
      const body = {
        descricao: descricao.trim(),
        valorMeta: parseFloat(valorMeta),
        valorAtual: parseFloat(valorAtual) || 0,
        prazo: prazo ? new Date(prazo + 'T12:00:00').toISOString() : null,
      };
      if (editando) {
        const updated = await api.atualizarMeta(editando.id, body);
        setMetas(prev => prev.map(m => m.id === editando.id ? updated : m));
      } else {
        const created = await api.criarMeta(body);
        setMetas(prev => [...prev, created]);
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
      await api.deletarMeta(id);
      setMetas(prev => prev.filter(m => m.id !== id));
    } catch {
      // silencioso — botão volta ao estado normal
    } finally {
      setConfirmandoDelete(null);
    }
  }

  async function confirmarAporte(meta) {
    const valor = parseFloat(aporteValor);
    if (!valor || valor <= 0) return;
    setAporteLoading(true);
    try {
      const body = {
        descricao: meta.descricao,
        valorMeta: meta.valorMeta,
        valorAtual: meta.valorAtual + valor,
        prazo: meta.prazo ?? null,
      };
      const updated = await api.atualizarMeta(meta.id, body);
      setMetas(prev => prev.map(m => m.id === meta.id ? updated : m));
      setAportando(null);
      setAporteValor('');
    } catch {
      // silencioso
    } finally {
      setAporteLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="section-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
          Metas financeiras
        </h2>
        {!showForm && (
          <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => abrirForm()}>
            + Nova meta
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16, borderColor: '#10b98140' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
            {editando ? 'Editar meta' : 'Nova meta'}
          </div>
          <div className="grid-2" style={{ marginBottom: 0 }}>
            <div className="field">
              <label>Descrição <span style={{ color: '#ef4444' }}>*</span></label>
              <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Reserva de emergência" />
            </div>
            <div className="field">
              <label>Prazo</label>
              <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Valor da meta (R$) <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="number" min="0" step="0.01" placeholder="10000" value={valorMeta} onChange={e => setValorMeta(e.target.value)} />
            </div>
            <div className="field">
              <label>Valor atual (R$)</label>
              <input type="number" min="0" step="0.01" placeholder="0" value={valorAtual} onChange={e => setValorAtual(e.target.value)} />
            </div>
          </div>
          {erroForm && <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{erroForm}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={fecharForm}>Cancelar</button>
          </div>
        </div>
      )}

      {loading && <div className="card" style={{ opacity: 0.4, height: 80 }} />}

      {!loading && metas.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p className="muted">Nenhuma meta financeira cadastrada.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {metas.map(m => {
          const pct = m.valorMeta > 0 ? Math.min(100, (m.valorAtual / m.valorMeta) * 100) : 0;
          const dias = diasRestantes(m.prazo);
          const concluida = pct >= 100;
          return (
            <div key={m.id} className="card" style={concluida ? { borderColor: '#10b98140' } : {}}>

              {/* Cabeçalho */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.descricao}
                    {concluida && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 500 }}>Concluída</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                    <span className="muted">{fmt(m.valorAtual)} de {fmt(m.valorMeta)}</span>
                    {dias !== null && (
                      <span style={{ fontSize: 12, color: dias <= 0 ? '#ef4444' : dias < 30 ? '#f59e0b' : '#64748b' }}>
                        {dias <= 0 ? 'Prazo vencido' : `${dias} dias restantes`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botões de ação */}
                {confirmandoDelete === m.id ? (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => deletar(m.id)}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => setConfirmandoDelete(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => abrirForm(m)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '4px 10px', color: '#94a3b8' }}
                      onClick={() => { setConfirmandoDelete(m.id); setAportando(null); }}
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              {/* Barra de progresso */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${pct}%`, background: concluida ? '#10b981' : 'var(--accent)' }}
                  />
                </div>
                <span style={{ fontSize: 13, color: '#94a3b8', minWidth: 36, textAlign: 'right' }}>
                  {Math.round(pct)}%
                </span>
              </div>

              {/* Aporte rápido */}
              {!concluida && (
                aportando === m.id ? (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Valor do aporte (R$)"
                      value={aporteValor}
                      onChange={e => setAporteValor(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && confirmarAporte(m)}
                      style={{ flex: 1 }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: '8px 14px', flexShrink: 0 }}
                      onClick={() => confirmarAporte(m)}
                      disabled={aporteLoading || !aporteValor}
                    >
                      {aporteLoading ? '...' : 'Aportar'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '8px 14px', flexShrink: 0 }}
                      onClick={() => { setAportando(null); setAporteValor(''); }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setAportando(m.id); setAporteValor(''); setConfirmandoDelete(null); }}
                    style={{
                      marginTop: 10, background: 'none', border: 'none',
                      color: 'var(--accent)', fontSize: 12, cursor: 'pointer', padding: 0,
                      textAlign: 'left',
                    }}
                  >
                    + Registrar aporte
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
