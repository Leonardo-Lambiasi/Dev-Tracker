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

const PRIORIDADE_COR = {
  alta:  { bg: '#ef444415', border: '#ef444440', label: '#ef4444', tag: 'Urgente' },
  media: { bg: '#f59e0b15', border: '#f59e0b40', label: '#f59e0b', tag: 'Atenção' },
  baixa: { bg: '#10b98115', border: '#10b98130', label: '#10b981', tag: 'Sugestão' },
};

function AnaliseVisual({ dados }) {
  // Detecta formato novo (resumo = string) vs formato antigo (resumo = objeto)
  const isNovoFormato = typeof dados.resumo === 'string';

  const categorias = (dados.categorias ?? []).filter(c => c.valor > 0);
  // suporte a maioresGastos (antigo) e maiores_gastos (novo)
  const maioresGastos = dados.maiores_gastos ?? dados.maioresGastos ?? [];
  const { padrao, recomendacao } = dados;
  // campos novos
  const projecao = dados.projecao;
  const acoes = dados.acoes_concretas ?? [];
  const alertas = dados.alertas ?? [];
  const metasImpacto = dados.metas_impacto ?? [];
  // campos antigos
  const dicasValidas = (dados.dicas ?? []).filter(d => d.titulo && d.texto);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Resumo */}
      {isNovoFormato ? (
        <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Resumo</div>
          <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{dados.resumo}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div style={{ background: '#10b98115', border: '1px solid #10b98130', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Entradas</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>{fmtBRL(dados.resumo?.entradas)}</div>
          </div>
          <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Saídas</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>{fmtBRL(dados.resumo?.saidas)}</div>
          </div>
          <div style={{
            background: (dados.resumo?.saldo ?? 0) >= 0 ? '#10b98115' : '#ef444415',
            border: `1px solid ${(dados.resumo?.saldo ?? 0) >= 0 ? '#10b98130' : '#ef444430'}`,
            borderRadius: 8, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Saldo</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: (dados.resumo?.saldo ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>{fmtBRL(dados.resumo?.saldo)}</div>
          </div>
        </div>
      )}

      {/* Projeção (novo) */}
      {projecao && (
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Projeção do mês</div>
          <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{projecao}</div>
        </div>
      )}

      {/* Categorias */}
      {categorias.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Gastos por categoria
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categorias.map((cat, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#cbd5e1' }}>{cat.nome}</span>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>
                    {fmtBRL(cat.valor)} · {Number(cat.percentual ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div style={{ background: '#2a2d3e', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(Number(cat.percentual ?? 0), 100)}%`, height: '100%', background: '#6366f1', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maiores gastos */}
      {maioresGastos.length > 0 && (
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
                <span style={{ fontSize: 13, color: '#cbd5e1' }}>{g.descricao}</span>
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

      {/* Ações concretas (novo) */}
      {acoes.length > 0 && (
        <div style={{ background: '#10b98110', border: '1px solid #10b98130', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Ações concretas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {acoes.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
                <span style={{ color: '#10b981', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas (novo) */}
      {alertas.length > 0 && (
        <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Alertas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alertas.map((a, i) => (
              <div key={i} style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>• {a}</div>
            ))}
          </div>
        </div>
      )}

      {/* Impacto nas metas (novo) */}
      {metasImpacto.length > 0 && (
        <div style={{ background: '#8b5cf610', border: '1px solid #8b5cf630', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Impacto nas metas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {metasImpacto.map((m, i) => (
              <div key={i}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', marginBottom: 2 }}>{m.meta}</div>
                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{m.observacao}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dicas (formato antigo — retrocompatibilidade) */}
      {dicasValidas.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Dicas para você
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dicasValidas.map((dica, i) => {
              const p = PRIORIDADE_COR[dica.prioridade] ?? PRIORIDADE_COR.baixa;
              return (
                <div key={i} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: p.label }}>{dica.titulo}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: p.label, background: p.border, borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase' }}>
                      {p.tag}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{dica.texto}</div>
                </div>
              );
            })}
          </div>
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
