import { useEffect, useState } from 'react';
import { api } from '../services/api';

function fmtData(str) {
  return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ExtratoPanel() {
  const [extrato, setExtrato] = useState('');
  const [resultado, setResultado] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [historico, setHistorico] = useState([]);
  const [showHistorico, setShowHistorico] = useState(false);

  useEffect(() => {
    api.getHistoricoFinanceiro()
      .then(data => setHistorico(data ?? []))
      .catch(() => {});
  }, []);

  async function analisar() {
    if (!extrato.trim()) { setErro('Cole o extrato antes de analisar.'); return; }
    setLoading(true);
    setErro('');
    setResultado('');
    try {
      const data = await api.analisarExtrato(extrato.trim());
      setResultado(data.analise);
      // atualiza histórico com o novo registro no topo
      api.getHistoricoFinanceiro().then(d => setHistorico(d ?? [])).catch(() => {});
    } catch (e) {
      setErro(e.message?.includes('500')
        ? 'Erro no servidor. Verifique se a API key do Gemini está configurada.'
        : 'Erro ao analisar extrato. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function limpar() {
    setExtrato('');
    setResultado('');
    setErro('');
  }

  return (
    <div className="card" style={{ borderColor: '#10b98140' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
          Análise de extrato — IA
        </h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Cole o extrato do banco (texto, CSV, tabela) e a IA categoriza e identifica padrões.
        </p>
      </div>

      {!resultado ? (
        <>
          <div className="field">
            <label>Extrato bancário</label>
            <textarea
              value={extrato}
              onChange={e => { setExtrato(e.target.value); setErro(''); }}
              placeholder={`Cole aqui o extrato. Exemplos de formato aceito:\n\n19/05 PIX recebido - Salário       R$ 3.500,00\n19/05 PIX enviado - Aluguel        R$ 900,00\n20/05 Débito - Supermercado        R$ 230,50\n20/05 Débito - Uber                R$ 18,90\n21/05 Assinatura - Netflix         R$ 45,90\n...`}
              style={{ minHeight: 200, fontFamily: 'monospace', fontSize: 13 }}
            />
          </div>

          {erro && <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

          <button
            type="button"
            className="btn btn-primary"
            onClick={analisar}
            disabled={loading || !extrato.trim()}
          >
            {loading ? 'Analisando...' : 'Analisar com IA'}
          </button>
        </>
      ) : (
        <div>
          <div style={{
            background: '#0f1117', border: '1px solid #2a2d3e',
            borderRadius: 10, padding: '20px 24px',
            lineHeight: 1.8, fontSize: 14, color: '#cbd5e1',
            whiteSpace: 'pre-wrap', marginBottom: 16,
          }}>
            {resultado}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={limpar}>
              Nova análise
            </button>
          </div>
        </div>
      )}

      {/* Histórico de análises anteriores */}
      {historico.length > 0 && (
        <div style={{ marginTop: 24, borderTop: '1px solid #2a2d3e', paddingTop: 16 }}>
          <button
            type="button"
            onClick={() => setShowHistorico(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#94a3b8', fontSize: 13, padding: 0,
            }}
          >
            <span>Análises anteriores ({historico.length})</span>
            <span style={{ fontSize: 11 }}>{showHistorico ? '▲' : '▼'}</span>
          </button>

          {showHistorico && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              {historico.map(a => (
                <div
                  key={a.id}
                  style={{
                    background: '#0f1117', border: '1px solid #2a2d3e',
                    borderRadius: 8, padding: '14px 18px',
                  }}
                >
                  <div className="muted" style={{ fontSize: 11, marginBottom: 10 }}>
                    {fmtData(a.criadoEm)}
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {a.conteudo}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
