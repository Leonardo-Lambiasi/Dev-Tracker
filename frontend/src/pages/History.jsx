import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const HUMOR_LABEL = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

function treinoLabel(tipo, isRafa) {
  if (!tipo || tipo === 'nenhum') return null;
  const base = { academia: 'Academia', volei: 'Vôlei', caminhada: 'Caminhada', 'caminhada/corrida': 'Caminhada/corrida', bike: 'Bike' };
  if (tipo === 'ambos') return isRafa ? 'Academia + Caminhada' : 'Academia + Vôlei';
  return base[tipo] ?? tipo;
}

function RafaExtrasRow({ dadosExtras }) {
  const extras = dadosExtras ? (() => { try { return JSON.parse(dadosExtras); } catch { return {}; } })() : {};
  const partes = [
    extras.qualidadeSono && `sono ${extras.qualidadeSono}/5`,
    extras.atendimentos && `${extras.atendimentos} atend.`,
  ].filter(Boolean);
  const gratidao = extras.gratidao || null;
  const firstLine = gratidao ? gratidao.split('\n')[0] : '';
  const snippet = gratidao ? firstLine.slice(0, 60) + (firstLine.length > 60 ? '…' : '') : null;
  if (!partes.length && !snippet) return null;
  return (
    <>
      {partes.length > 0 && (
        <div style={{ width: '100%', fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
          {partes.join(' · ')}
        </div>
      )}
      {snippet && (
        <div style={{ width: '100%', fontSize: 12, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>
          "{snippet}"
        </div>
      )}
    </>
  );
}

function fmtData(str) {
  return new Date(str).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function History() {
  const { usuario } = useAuth();
  const isRafa = usuario === 'rafa';
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [erroDelete, setErroDelete] = useState('');
  const [confirmando, setConfirmando] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [erroExport, setErroExport] = useState('');

  async function handleExportarPdf() {
    setExportando(true);
    setErroExport('');
    try {
      await api.exportarPdf();
    } catch {
      setErroExport('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setExportando(false);
    }
  }

  useEffect(() => {
    api.listarRegistros()
      .then(setRegistros)
      .catch(() => setErro('Não foi possível carregar o histórico.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    try {
      await api.deletarRegistro(id);
      setRegistros(prev => prev.filter(r => r.id !== id));
      setErroDelete('');
    } catch {
      setErroDelete('Erro ao remover registro. Tente novamente.');
    } finally {
      setConfirmando(null);
    }
  }

  if (loading) return <p className="muted">Carregando...</p>;

  if (erro) return (
    <div className="card" style={{ borderColor: '#ef444440', padding: 24, textAlign: 'center' }}>
      <p style={{ color: '#fca5a5' }}>{erro}</p>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Histórico</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="muted">{registros.length} registros</span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '5px 12px' }}
            onClick={handleExportarPdf}
            disabled={exportando}
            title="Baixar PDF com os últimos 7 dias"
          >
            {exportando ? 'Gerando PDF...' : 'Exportar PDF (7 dias)'}
          </button>
        </div>
      </div>

      {erroExport && (
        <div style={{
          background: '#ef444420', border: '1px solid #ef444440',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          color: '#fca5a5', fontSize: 13,
        }}>
          {erroExport}
        </div>
      )}

      {erroDelete && (
        <div style={{
          background: '#ef444420', border: '1px solid #ef444440',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          color: '#fca5a5', fontSize: 13,
        }}>
          {erroDelete}
        </div>
      )}

      {registros.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Nenhum registro ainda</div>
          <p className="muted">Comece registrando o seu dia pela aba "Registrar".</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {registros.map(r => (
          <div key={r.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>

              {/* Data + Humor */}
              <div style={{ minWidth: 100, flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc' }}>
                  {fmtData(r.data)}
                </div>
                {r.humor && (
                  <div style={{ fontSize: 24, marginTop: 6 }}>{HUMOR_LABEL[r.humor]}</div>
                )}
              </div>

              {/* Tags de dados */}
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                {r.horasEstudo > 0 && (
                  <Tag color="#6366f1">{r.horasEstudo}h estudo{r.topicoEstudo ? ` · ${r.topicoEstudo}` : ''}</Tag>
                )}
                {(r.featuresRift > 0 || r.bugsRift > 0) && (
                  <Tag color="#10b981">{r.featuresRift} feat · {r.bugsRift} bugs</Tag>
                )}
                {treinoLabel(r.treinoTipo, isRafa) && (
                  <Tag color="#f59e0b">
                    {treinoLabel(r.treinoTipo, isRafa)}
                    {r.treinoRendimento ? ` · ${r.treinoRendimento}/5` : ''}
                  </Tag>
                )}
                {r.destaque && (
                  <div style={{ width: '100%', fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                    <span style={{ color: '#64748b' }}>Destaque: </span>{r.destaque}
                  </div>
                )}
                {r.desafios && (
                  <div style={{ width: '100%', fontSize: 13, color: '#94a3b8' }}>
                    <span style={{ color: '#64748b' }}>O que foi difícil: </span>{r.desafios}
                  </div>
                )}
                {isRafa && <RafaExtrasRow dadosExtras={r.dadosExtras} />}
              </div>

              {/* Ações */}
              <div style={{ flexShrink: 0 }}>
                {confirmando === r.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => handleDelete(r.id)}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => setConfirmando(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '4px 10px', color: '#64748b' }}
                    onClick={() => setConfirmando(r.id)}
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tag({ children, color }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 500,
      background: `${color}18`,
      color,
      padding: '4px 10px',
      borderRadius: 6,
      border: `1px solid ${color}30`,
    }}>
      {children}
    </span>
  );
}
