import { useEffect, useState } from 'react';
import { api } from '../services/api';

function fmtData(str) {
  return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtBRL(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
}

function parseAnalise(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function AnaliseVisual({ dados }) {
  const { resumo, categorias, maioresGastos, padrao, recomendacao } = dados;
  const saldoPos = (resumo?.saldo ?? 0) >= 0;
  const categoriasComValor = (categorias ?? []).filter(c => c.valor > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div style={{ background: '#10b98115', border: '1px solid #10b98130', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Entradas</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>{fmtBRL(resumo?.entradas)}</div>
        </div>
        <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Saídas</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>{fmtBRL(resumo?.saidas)}</div>
        </div>
        <div style={{
          background: saldoPos ? '#10b98115' : '#ef444415',
          border: `1px solid ${saldoPos ? '#10b98130' : '#ef444430'}`,
          borderRadius: 8, padding: '12px 14px',
        }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Saldo</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: saldoPos ? '#10b981' : '#ef4444' }}>{fmtBRL(resumo?.saldo)}</div>
        </div>
      </div>

      {/* Categorias */}
      {categoriasComValor.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Gastos por categoria
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categoriasComValor.map((cat, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#cbd5e1' }}>{cat.nome}</span>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>
                    {fmtBRL(cat.valor)} · {Number(cat.percentual ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div style={{ background: '#2a2d3e', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(Number(cat.percentual ?? 0), 100)}%`,
                    height: '100%', background: '#6366f1', borderRadius: 4,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maiores gastos */}
      {maioresGastos?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Top gastos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {maioresGastos.map((g, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', background: '#0f1117', borderRadius: 6, border: '1px solid #2a2d3e',
              }}>
                <div>
                  <span style={{ fontSize: 13, color: '#cbd5e1' }}>{g.descricao}</span>
                  {g.data && <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{g.data}</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>{fmtBRL(g.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Padrão e Recomendação */}
      {(padrao || recomendacao) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {padrao && (
            <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Padrão</div>
              <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{padrao}</div>
            </div>
          )}
          {recomendacao && (
            <div style={{ background: '#10b98110', border: '1px solid #10b98130', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Recomendação</div>
              <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{recomendacao}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExtratoPanel() {
  const [modo, setModo] = useState('texto'); // 'texto' | 'pdf'
  const [extrato, setExtrato] = useState('');
  const [pdfArquivo, setPdfArquivo] = useState(null);
  const [resultado, setResultado] = useState(null);
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
    setLoading(true);
    setErro('');
    setResultado(null);
    try {
      let data;
      if (modo === 'pdf') {
        if (!pdfArquivo) { setErro('Selecione um arquivo PDF.'); setLoading(false); return; }
        data = await api.analisarPdf(pdfArquivo);
      } else {
        if (!extrato.trim()) { setErro('Cole o extrato antes de analisar.'); setLoading(false); return; }
        data = await api.analisarExtrato(extrato.trim());
      }
      const raw = data.analise;
      const dados = parseAnalise(raw);
      setResultado({ raw, dados });
      api.getHistoricoFinanceiro().then(d => setHistorico(d ?? [])).catch(() => {});
    } catch (e) {
      setErro(e.message?.includes('500')
        ? 'Erro no servidor. Verifique se a API key do Gemini está configurada.'
        : (e.message ?? 'Erro ao analisar. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  function limpar() {
    setExtrato('');
    setPdfArquivo(null);
    setResultado(null);
    setErro('');
  }

  const podeAnalisar = modo === 'pdf' ? !!pdfArquivo : !!extrato.trim();

  return (
    <div className="card" style={{ borderColor: '#10b98140' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Análise de extrato — IA</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Cole o extrato em texto ou envie o PDF do banco — a IA categoriza e identifica padrões.
        </p>
      </div>

      {!resultado ? (
        <>
          {/* Seletor de modo */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['texto', 'pdf'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setModo(m); setErro(''); }}
                style={{
                  padding: '6px 16px', borderRadius: 8, border: '1px solid',
                  borderColor: modo === m ? '#10b981' : '#2a2d3e',
                  background: modo === m ? '#10b98115' : 'transparent',
                  color: modo === m ? '#10b981' : '#94a3b8',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                }}
              >
                {m === 'texto' ? 'Colar texto' : 'Enviar PDF'}
              </button>
            ))}
          </div>

          {modo === 'texto' ? (
            <div className="field">
              <label>Extrato bancário</label>
              <textarea
                value={extrato}
                onChange={e => { setExtrato(e.target.value); setErro(''); }}
                placeholder={`Cole aqui o extrato. Exemplo:\n\n19/05 PIX recebido - Salário       R$ 3.500,00\n19/05 Débito - Aluguel             R$ 900,00\n20/05 Débito - Supermercado        R$ 230,50`}
                style={{ minHeight: 180, fontFamily: 'monospace', fontSize: 13 }}
              />
            </div>
          ) : (
            <div className="field">
              <label>Arquivo PDF do extrato</label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={e => { setPdfArquivo(e.target.files?.[0] ?? null); setErro(''); }}
                style={{ fontSize: 13, color: '#cbd5e1' }}
              />
              {pdfArquivo && (
                <div style={{ fontSize: 12, color: '#10b981', marginTop: 6 }}>
                  {pdfArquivo.name} ({(pdfArquivo.size / 1024).toFixed(0)} KB)
                </div>
              )}
            </div>
          )}

          {erro && <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

          <button
            type="button"
            className="btn btn-primary"
            onClick={analisar}
            disabled={loading || !podeAnalisar}
          >
            {loading ? 'Analisando... pode levar até 30s' : 'Analisar com IA'}
          </button>
        </>
      ) : (
        <div>
          {resultado.dados ? (
            <AnaliseVisual dados={resultado.dados} />
          ) : (
            <div style={{
              background: '#0f1117', border: '1px solid #2a2d3e',
              borderRadius: 10, padding: '20px 24px',
              lineHeight: 1.8, fontSize: 14, color: '#cbd5e1', whiteSpace: 'pre-wrap',
            }}>
              {resultado.raw}
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={limpar}>
              Nova análise
            </button>
          </div>
        </div>
      )}

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
              {historico.map(a => {
                const dados = parseAnalise(a.conteudo);
                return (
                  <div key={a.id} style={{ background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 8, padding: '14px 18px' }}>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 10 }}>{fmtData(a.criadoEm)}</div>
                    {dados ? (
                      <AnaliseVisual dados={dados} />
                    ) : (
                      <div style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                        {a.conteudo}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
