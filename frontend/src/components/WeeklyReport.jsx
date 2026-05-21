import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function WeeklyReport() {
  const [analise, setAnalise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getUltimaAnalise()
      .then(data => {
        if (data?.conteudo) setAnalise(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function gerar() {
    setGerando(true);
    setMsg('');
    try {
      const result = await api.gerarAnalise();
      if (result?.conteudo) {
        setAnalise(result);
      } else {
        setMsg(result?.message ?? 'Análise gerada sem conteúdo. Tente novamente.');
      }
    } catch {
      setMsg('Erro ao gerar análise. Tente novamente.');
    } finally {
      setGerando(false);
    }
  }

  function diasDesdeUltima() {
    if (!analise?.criadoEm) return Infinity;
    return (Date.now() - new Date(analise.criadoEm).getTime()) / (1000 * 60 * 60 * 24);
  }

  const podGerar = diasDesdeUltima() >= 3 || !analise;

  return (
    <div className="card" style={{ borderColor: 'var(--accent-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="section-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
          Análise semanal — IA
        </h2>
        {podGerar && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={gerar}
            disabled={gerando}
            style={{ fontSize: 13 }}
          >
            {gerando ? 'Gerando...' : 'Gerar análise'}
          </button>
        )}
      </div>

      {loading && <p className="muted">Carregando...</p>}

      {msg && (
        <div style={{
          background: '#6366f110', border: '1px solid #6366f130',
          borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#a5b4fc',
        }}>
          {msg}
        </div>
      )}

      {!loading && !analise && !msg && (
        <p className="muted">
          Nenhuma análise gerada ainda. Registre a semana e clique em "Gerar análise".
        </p>
      )}

      {analise && (
        <>
          <p className="muted" style={{ marginBottom: 16, fontSize: 12 }}>
            Gerado em {new Date(analise.criadoEm).toLocaleDateString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })}
          </p>
          <div style={{ lineHeight: 1.8, fontSize: 14, color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
            {analise.conteudo}
          </div>
          {!podGerar && (
            <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
              Próxima análise disponível em {Math.ceil(7 - diasDesdeUltima())} dia(s).
            </p>
          )}
        </>
      )}
    </div>
  );
}
