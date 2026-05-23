import { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function SectionHeader({ title, open, onToggle, hint }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: '#e2e8f0', fontSize: 14, fontWeight: 600, padding: 0, gap: 8,
      }}
    >
      <span>{title}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {hint && !open && (
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 400 }}>{hint}</span>
        )}
        <span style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1 }}>{open ? '▲' : '▼'}</span>
      </span>
    </button>
  );
}

function Section({ title, open, onToggle, hint, children }) {
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <SectionHeader title={title} open={open} onToggle={onToggle} hint={hint} />
      {open && <div style={{ marginTop: 20 }}>{children}</div>}
    </div>
  );
}

const HUMOR_CORES = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
};
const HUMOR_LABELS = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

function HumorBtns({ value, onChange, colorido }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[1, 2, 3, 4, 5].map(n => {
        const cor = colorido ? HUMOR_CORES[n] : '#6366f1';
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            style={{
              width: 52, height: 52,
              borderRadius: 10, border: '2px solid',
              borderColor: selected ? cor : '#2a2d3e',
              background: selected ? `${cor}20` : '#0f1117',
              cursor: 'pointer', fontSize: 22,
              transition: 'all 0.12s',
            }}
          >
            {HUMOR_LABELS[n]}
          </button>
        );
      })}
    </div>
  );
}

function RatingBtns({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          style={{
            width: 40, height: 40,
            borderRadius: 10, border: '2px solid',
            borderColor: value === n ? 'var(--accent)' : '#2a2d3e',
            background: value === n ? 'var(--accent-bg)' : '#0f1117',
            cursor: 'pointer', fontSize: 14,
            fontWeight: 600, color: value === n ? '#a5b4fc' : '#64748b',
            transition: 'all 0.12s',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <span style={{ fontSize: 14, color: '#cbd5e1' }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          width: 48, height: 26, borderRadius: 13,
          background: value ? 'var(--accent)' : '#2a2d3e',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: 3,
          left: value ? 25 : 3,
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

export default function DailyForm({ onSuccess }) {
  const { usuario } = useAuth();
  const isRafa = usuario === 'rafa';

  const [data, setData] = useState(localToday());
  const [humor, setHumor] = useState(null);
  const [horasEstudo, setHorasEstudo] = useState('');
  const [topicoEstudo, setTopicoEstudo] = useState('');
  const [ticketsTrabalhados, setTicketsTrabalhados] = useState('');
  const [horasTrabalhadas, setHorasTrabalhadas] = useState('');
  const [treinoTipo, setTreinoTipo] = useState('');
  const [treinoRendimento, setTreinoRendimento] = useState(null);
  const [treinoObs, setTreinoObs] = useState('');
  const [conquistas, setConquistas] = useState('');
  const [desafios, setDesafios] = useState('');
  const [destaque, setDestaque] = useState('');

  // extras específicos da Rafa
  const [extras, setExtras] = useState({
    aguaBebida: false,
    seguiuDieta: false,
    supervisao: false,
    qualidadeSono: null,
    gratidao: '',
    atendimentos: '',
    conteudoPostado: '',
  });

  const treinoOpcoes = isRafa
    ? ['academia', 'caminhada/corrida', 'bike', 'nenhum']
    : ['academia', 'volei', 'ambos', 'nenhum'];

  const sectionsDefault = isRafa
    ? { saude: true, treino: false, reflexao: false }
    : { estudos: true, trabalho: false, treino: false, reflexao: false };

  const [open, setOpen] = useState(sectionsDefault);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [insightDiario, setInsightDiario] = useState(null);

  function toggle(key) {
    setOpen(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function setExtra(key, value) {
    setExtras(prev => ({ ...prev, [key]: value }));
  }

  function estudosHint() {
    const parts = [];
    if (horasEstudo) parts.push(`${horasEstudo}h`);
    if (topicoEstudo) parts.push(topicoEstudo);
    return parts.join(' · ') || null;
  }

  function trabalhoHint() {
    const parts = [];
    if (ticketsTrabalhados) parts.push(`${ticketsTrabalhados} tickets`);
    if (horasTrabalhadas) parts.push(`${horasTrabalhadas}h`);
    return parts.join(' · ') || null;
  }

  function treinoHint() {
    if (!treinoTipo) return null;
    const labelMap = { volei: 'Vôlei', academia: 'Academia', caminhada: 'Caminhada', 'caminhada/corrida': 'Caminhada/corrida', bike: 'Bike', ambos: 'Ambos', nenhum: 'Nenhum' };
    const label = labelMap[treinoTipo] ?? treinoTipo;
    return treinoRendimento ? `${label} · ${treinoRendimento}/5` : label;
  }

  function reflexaoHint() {
    const parts = [];
    if (conquistas) parts.push('conquistas');
    if (desafios) parts.push('desafios');
    if (destaque) parts.push('destaques');
    return parts.join(' + ') || null;
  }

  function saudeHint() {
    const preenchidos = [
      extras.qualidadeSono && `sono ${extras.qualidadeSono}/5`,
      extras.atendimentos && `${extras.atendimentos} atend.`,
    ].filter(Boolean);
    return preenchidos.length > 0 ? preenchidos.join(' · ') : null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!humor) {
      setErro('Selecione seu humor do dia antes de registrar.');
      return;
    }
    setErro('');
    setLoading(true);

    try {
      const dadosExtras = isRafa
        ? JSON.stringify({
            qualidadeSono: extras.qualidadeSono ?? null,
            gratidao: extras.gratidao || null,
            atendimentos: extras.atendimentos ? parseInt(extras.atendimentos, 10) : 0,
            conteudoPostado: extras.conteudoPostado ? parseInt(extras.conteudoPostado, 10) : 0,
          })
        : null;

      const result = await api.criarRegistro({
        data: new Date(data + 'T12:00:00').toISOString(),
        humor,
        horasEstudo: horasEstudo ? parseFloat(horasEstudo) : null,
        topicoEstudo: topicoEstudo || null,
        ticketsTrabalhados: (!isRafa && ticketsTrabalhados) ? parseInt(ticketsTrabalhados, 10) : null,
        horasTrabalhadas: horasTrabalhadas ? parseFloat(horasTrabalhadas) : null,
        treinoTipo: treinoTipo || null,
        treinoRendimento: treinoRendimento || null,
        treinoObs: treinoObs || null,
        conquistas: conquistas || null,
        desafios: desafios || null,
        destaque: destaque || null,
        dadosExtras,
      });

      const insight = result?.insightDiario ?? null;
      setInsightDiario(insight);
      setSucesso(true);
      if (!insight) {
        setTimeout(() => onSuccess?.(), 1000);
      }
    } catch (err) {
      setErro(err?.message?.startsWith('HTTP') ? 'Erro ao salvar. Tente novamente.' : (err?.message ?? 'Erro ao salvar.'));
    } finally {
      setLoading(false);
    }
  }

  if (sucesso) {
    if (insightDiario) {
      return (
        <div className="card" style={{ padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#e2e8f0' }}>
            {isRafa ? 'Mensagem de hoje' : 'Insight de hoje'}
          </div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 20 }}>Gerado pelo assistente</div>
          <div style={{ lineHeight: 1.8, fontSize: 14, color: '#cbd5e1', whiteSpace: 'pre-wrap', marginBottom: 28 }}>
            {insightDiario}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: 13, fontSize: 15 }}
            onClick={() => onSuccess?.()}
          >
            Ver dashboard
          </button>
        </div>
      );
    }
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Dia registrado!</div>
        <div className="muted">Redirecionando para o dashboard...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* Geral — sempre visível */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="section-title">Geral</div>

        <div className="field">
          <label>Data</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)} />
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>
            {isRafa ? 'Como você está se sentindo de verdade hoje?' : 'Humor do dia'}
            <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>
          </label>
          <HumorBtns value={humor} onChange={setHumor} colorido={isRafa} />
          {!humor && erro && (
            <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{erro}</p>
          )}
        </div>
      </div>

      {/* Saúde & bem-estar — só Rafa */}
      {isRafa && (
        <Section
          title="Saúde & bem-estar"
          open={open.saude}
          onToggle={() => toggle('saude')}
          hint={saudeHint()}
        >
          <div className="field">
            <label>Qualidade do sono</label>
            <RatingBtns value={extras.qualidadeSono} onChange={v => setExtra('qualidadeSono', v)} />
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Atendimentos realizados</label>
              <input
                type="number" min="0"
                placeholder="ex: 5"
                value={extras.atendimentos}
                onChange={e => setExtra('atendimentos', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Conteúdos postados</label>
              <input
                type="number" min="0"
                placeholder="ex: 1"
                value={extras.conteudoPostado}
                onChange={e => setExtra('conteudoPostado', e.target.value)}
              />
            </div>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Gratidão do dia</label>
            <textarea
              placeholder="Pelo que você é grata hoje?"
              value={extras.gratidao}
              onChange={e => setExtra('gratidao', e.target.value)}
            />
          </div>
        </Section>
      )}

      {/* Estudos — só Leo */}
      {!isRafa && (
        <Section
          title="Estudos"
          open={open.estudos}
          onToggle={() => toggle('estudos')}
          hint={estudosHint()}
        >
          <div className="grid-2">
            <div className="field">
              <label>Horas estudadas</label>
              <input
                type="number" min="0" max="24" step="0.5"
                placeholder="ex: 1.5"
                value={horasEstudo}
                onChange={e => setHorasEstudo(e.target.value)}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Tópico estudado</label>
              <input
                type="text"
                placeholder="ex: React hooks, SQL joins..."
                value={topicoEstudo}
                onChange={e => setTopicoEstudo(e.target.value)}
              />
            </div>
          </div>
        </Section>
      )}

      {/* Trabalho — só Leo */}
      {!isRafa && (
        <Section
          title="Trabalho (Rift)"
          open={open.trabalho}
          onToggle={() => toggle('trabalho')}
          hint={trabalhoHint()}
        >
          <div className="grid-2">
            <div className="field">
              <label>Tickets trabalhados</label>
              <input
                type="number" min="0"
                placeholder="ex: 3"
                value={ticketsTrabalhados}
                onChange={e => setTicketsTrabalhados(e.target.value)}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Horas trabalhadas</label>
              <input
                type="number" min="0" max="24" step="0.5"
                placeholder="ex: 8"
                value={horasTrabalhadas}
                onChange={e => setHorasTrabalhadas(e.target.value)}
              />
            </div>
          </div>
        </Section>
      )}

      {/* Treino — ambos */}
      <Section
        title="Treino"
        open={open.treino}
        onToggle={() => toggle('treino')}
        hint={treinoHint()}
      >
        <div className="field">
          <label>Tipo de treino</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {treinoOpcoes.map(t => {
              const labelMap = { volei: 'Vôlei', academia: 'Academia', caminhada: 'Caminhada', 'caminhada/corrida': 'Caminhada/corrida', bike: 'Bike', ambos: 'Ambos', nenhum: 'Nenhum' };
              const label = labelMap[t] ?? t;
              const selected = treinoTipo === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTreinoTipo(selected ? '' : t)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid',
                    borderColor: selected ? 'var(--accent)' : '#2a2d3e',
                    background: selected ? 'var(--accent-bg)' : 'transparent',
                    color: selected ? '#a5b4fc' : '#94a3b8',
                    cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {treinoTipo && treinoTipo !== 'nenhum' && (
          <>
            <div className="field">
              <label>Rendimento</label>
              <RatingBtns value={treinoRendimento} onChange={setTreinoRendimento} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Observação</label>
              <textarea
                placeholder={isRafa ? 'ex: caminhada leve, dor no joelho...' : 'ex: PR no supino, joelho doendo...'}
                value={treinoObs}
                onChange={e => setTreinoObs(e.target.value)}
              />
            </div>
          </>
        )}
      </Section>

      {/* Reflexão — ambos */}
      <Section
        title="Reflexão"
        open={open.reflexao}
        onToggle={() => toggle('reflexao')}
        hint={reflexaoHint()}
      >
        <div className="field">
          <label>Conquistas</label>
          <textarea
            placeholder={isRafa ? 'O que foi bem hoje?' : 'O que você concluiu ou entregou hoje?'}
            value={conquistas}
            onChange={e => setConquistas(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Desafios</label>
          <textarea
            placeholder={isRafa ? 'O que foi difícil ou pesado?' : 'O que travou? Bloqueios, dificuldades, distrações...'}
            value={desafios}
            onChange={e => setDesafios(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Destaques</label>
          <textarea
            placeholder={isRafa ? 'Algo que você quer lembrar desse dia...' : 'Insight, algo que aprendeu, momento marcante...'}
            value={destaque}
            onChange={e => setDestaque(e.target.value)}
          />
        </div>
      </Section>

      {erro && humor && (
        <div style={{
          background: '#ef444420', border: '1px solid #ef444440',
          borderRadius: 8, padding: '10px 14px', marginBottom: 12,
          color: '#fca5a5', fontSize: 13,
        }}>
          {erro}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading}
        style={{ width: '100%', padding: 13, fontSize: 15, marginTop: 4 }}
      >
        {loading ? 'Salvando...' : 'Registrar o dia'}
      </button>
    </form>
  );
}
