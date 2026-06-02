import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useModoCuidado } from '../hooks/useModoCuidado';
import FocoProjetos from './FocoProjetos';
import ProjectTracker from './ProjectTracker';
import FinancePanel from './FinancePanel';
import ExtratoPanel from './ExtratoPanel';
import TrainingPanel from './TrainingPanel';
import WeeklyGrid from './WeeklyGrid';
import WeeklyReport from './WeeklyReport';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function extrasInt(registro, key) {
  if (!registro.dadosExtras) return 0;
  try {
    const obj = JSON.parse(registro.dadosExtras);
    return parseInt(obj[key] ?? 0, 10) || 0;
  } catch { return 0; }
}

function extrasStr(registro, key) {
  if (!registro.dadosExtras) return null;
  try {
    const obj = JSON.parse(registro.dadosExtras);
    return obj[key] ?? null;
  } catch { return null; }
}

function humorCor(valor) {
  if (valor >= 4.5) return '#22c55e';
  if (valor >= 3.5) return '#84cc16';
  if (valor >= 2.5) return '#eab308';
  if (valor >= 1.5) return '#f97316';
  return '#ef4444';
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const isRafa = usuario === 'rafa';

  const [resumo, setResumo] = useState(null);
  const [semana, setSemana] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [aderenciaData, setAderenciaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [treinoColapsado, setTreinoColapsado] = useState(false);
  const [rotinaColapsada, setRotinaColapsada] = useState(false);

  const modoCuidado = useModoCuidado(semana);

  // Aplica tema por usuário
  useEffect(() => {
    if (isRafa) {
      document.documentElement.style.setProperty('--accent', '#9333ea');
      document.documentElement.style.setProperty('--accent-bg', '#9333ea20');
    } else {
      document.documentElement.style.setProperty('--accent', '#6366f1');
      document.documentElement.style.setProperty('--accent-bg', '#6366f120');
    }
    return () => {
      document.documentElement.style.setProperty('--accent', '#6366f1');
      document.documentElement.style.setProperty('--accent-bg', '#6366f120');
    };
  }, [isRafa]);

  useEffect(() => {
    const inicio28 = new Date();
    inicio28.setDate(inicio28.getDate() - 28);

    const promises = [
      api.getResumo(),
      api.getSemana(),
      api.listarRegistros({ inicio: inicio28.toISOString() }),
    ];

    Promise.all(promises)
      .then(([r, s, h]) => {
        setResumo(r);
        setSemana(s ?? []);
        setHistorico(h ?? []);
      })
      .catch(() => setErro('Não foi possível carregar os dados. Tente recarregar a página.'))
      .finally(() => setLoading(false));

    if (isRafa) {
      api.getAderencia(4).then(d => setAderenciaData(d ?? [])).catch(() => {});
    }
  }, []);

  if (loading) {
    return (
      <div>
        <div className="grid-4" style={{ marginBottom: 32 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="card" style={{ height: 88, opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="card" style={{ borderColor: '#ef444440', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Backend offline</div>
        <div className="muted">{erro}</div>
      </div>
    );
  }

  const hoje = localToday();
  const registrouHoje = semana.some(r => r.data?.slice(0, 10) === hoje);

  const mostrarBannerHumor = isRafa && modoCuidado && !bannerDismissed;

  // Métricas Rafa — bem-estar
  const totalAtend = semana.reduce((acc, r) => acc + extrasInt(r, 'atendimentos'), 0);
  const totalConteudo = semana.reduce((acc, r) => acc + extrasInt(r, 'conteudoPostado'), 0);
  const totalCancelamentos = semana.reduce((acc, r) => acc + extrasInt(r, 'cancelamentos'), 0);

  // Lazer — dados do historico (28 dias) agrupados por semana
  const LAZER_CORES = ['#9333ea', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#84cc16', '#f472b6'];
  function getMondayLabel(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return mon.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  const lazerPorSemana = {};
  const lazeresSemanaAtual = new Set();
  historico.forEach(r => {
    const lazer = extrasStr(r, 'lazer');
    const intensidade = extrasInt(r, 'lazerIntensidade');
    if (!lazer) return;
    const sem = getMondayLabel(r.data);
    if (!lazerPorSemana[sem]) lazerPorSemana[sem] = { semana: sem };
    lazerPorSemana[sem][lazer] = (lazerPorSemana[sem][lazer] || 0) + (intensidade || 1);
  });
  semana.forEach(r => { const l = extrasStr(r, 'lazer'); if (l) lazeresSemanaAtual.add(l); });
  const lazerData = Object.values(lazerPorSemana).slice(-4);
  const lazeresTodos = [...new Set(historico.map(r => extrasStr(r, 'lazer')).filter(Boolean))];
  const diasComLazer = semana.filter(r => extrasStr(r, 'lazer')).length;

  // Aderência
  const aderenciaAtual = aderenciaData.length > 0 ? aderenciaData[aderenciaData.length - 1] : null;
  const aderenciaAnterior = aderenciaData.length > 1 ? aderenciaData[aderenciaData.length - 2] : null;
  const tendenciaAderencia = aderenciaAtual?.aderencia != null && aderenciaAnterior?.aderencia != null
    ? aderenciaAtual.aderencia > aderenciaAnterior.aderencia ? '↑' : aderenciaAtual.aderencia < aderenciaAnterior.aderencia ? '↓' : '→'
    : null;

  // Treino Rafa
  const diasAcademiaRafa = semana.filter(r => r.treinoTipo === 'academia' || r.treinoTipo === 'ambos').length;
  const diasCaminhadaRafa = semana.filter(r => r.treinoTipo === 'caminhada/corrida' || r.treinoTipo === 'ambos').length;
  const diasBikeRafa = semana.filter(r => r.treinoTipo === 'bike').length;

  // Card "Coisas boas" — Rafa
  const gratidoesSemana = semana
    .map(r => extrasStr(r, 'gratidao'))
    .filter(g => g && g.trim());
  const conquistasSemana = semana
    .map(r => r.conquistas)
    .filter(c => c && c.trim());

  // Gráfico de sono — Rafa
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const sonoData = isRafa
    ? [...semana].reverse().map(r => ({
        dia: DIAS[new Date(r.data).getDay()],
        sono: extrasInt(r, 'qualidadeSono') || null,
      })).filter(d => d.sono !== null)
    : [];

  // Gráfico de linha — horas/dia (últimas 4 semanas)  — só Leo
  const horasData = [...historico].reverse().map(r => ({
    dia: new Date(r.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    horas: r.horasEstudo ?? 0,
  }));

  // Gráfico de barra — humor/dia (semana)
  const humorData = [...semana].reverse().map(r => ({
    dia: DIAS[new Date(r.data).getDay()],
    humor: r.humor ?? 0,
  }));

  // Pizza — tópicos estudados
  const topicosMap = {};
  historico.forEach(r => {
    if (r.topicoEstudo && r.horasEstudo > 0)
      topicosMap[r.topicoEstudo] = (topicosMap[r.topicoEstudo] || 0) + (r.horasEstudo ?? 0);
  });
  const topicosData = Object.entries(topicosMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const tooltipStyle = {
    contentStyle: { background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 13 },
    labelStyle: { color: '#e2e8f0' },
  };

  const humorMedio = resumo?.humorMedio ? Number(resumo.humorMedio) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Banner modo cuidado — Rafa */}
      {mostrarBannerHumor && (
        <div style={{
          background: '#f3e8ff', border: '0.5px solid #d8b4fe',
          borderRadius: 12, padding: '16px 20px', marginBottom: 4,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#581c87', marginBottom: 4 }}>
              Esta semana foi difícil. Tudo bem descansar. 💜
            </div>
            <div style={{ fontSize: 13, color: '#7c3aed' }}>
              O app está aqui pra te ajudar a se ver com mais gentileza.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            style={{ background: 'none', border: 'none', color: '#9333ea', cursor: 'pointer', fontSize: 18 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Banner "registrar hoje" */}
      {!registrouHoje && (
        <div style={{
          background: 'var(--accent-bg)', border: '1px solid',
          borderColor: isRafa ? '#9333ea40' : '#6366f130',
          borderRadius: 12, padding: '14px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14, color: isRafa ? '#d8b4fe' : '#a5b4fc' }}>
            Você ainda não registrou o dia de hoje.
          </span>
          <Link to="/registrar">
            <button type="button" className="btn btn-primary" style={{ fontSize: 13 }}>
              Registrar agora
            </button>
          </Link>
        </div>
      )}

      {/* Cards bem-estar — Rafa */}
      {isRafa && (
        <>
          <div>
            <h2 className="section-title">Bem-estar da semana</h2>
            {!modoCuidado && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div className="card">
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Humor médio
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: humorMedio ? humorCor(humorMedio) : '#64748b', lineHeight: 1 }}>
                    {humorMedio ? `${humorMedio.toFixed(1)}/5` : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>essa semana</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Atendimentos
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#9333ea', lineHeight: 1 }}>
                    {totalAtend}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>essa semana</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Cancelamentos
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: totalCancelamentos > 0 ? '#f97316' : '#9333ea', lineHeight: 1 }}>
                    {totalCancelamentos}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>essa semana</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Conteúdo postado
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#9333ea', lineHeight: 1 }}>{totalConteudo}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>essa semana</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Lazer esta semana
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: diasComLazer > 0 ? '#9333ea' : '#64748b', lineHeight: 1 }}>
                    {diasComLazer}<span style={{ fontSize: 14, color: '#64748b' }}>/7</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                    {diasComLazer > 0 ? [...lazeresSemanaAtual].join(', ') : 'nenhum registrado'}
                  </div>
                </div>

                {aderenciaAtual && (
                  <div className="card">
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Aderência rotina
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#9333ea', lineHeight: 1 }}>
                      {aderenciaAtual.aderencia != null ? `${aderenciaAtual.aderencia.toFixed(0)}%` : '—'}
                      {tendenciaAderencia && (
                        <span style={{ fontSize: 14, marginLeft: 6, color: tendenciaAderencia === '↑' ? '#22c55e' : tendenciaAderencia === '↓' ? '#ef4444' : '#94a3b8' }}>
                          {tendenciaAderencia}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>esta semana</div>
                  </div>
                )}
              </div>
            )}

            {/* Card "Coisas boas" — sempre visível para Rafa */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-title" style={{ marginBottom: 12 }}>Coisas boas dessa semana</div>
              {gratidoesSemana.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#9333ea', fontWeight: 600, marginBottom: 6 }}>Gratidões</div>
                  {gratidoesSemana.map((g, i) => (
                    <div key={i} style={{ fontSize: 13, fontStyle: 'italic', color: '#cbd5e1', marginBottom: 4 }}>"{g}"</div>
                  ))}
                </div>
              )}
              {conquistasSemana.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: '#9333ea', fontWeight: 600, marginBottom: 6 }}>Conquistas</div>
                  {conquistasSemana.map((c, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 4 }}>• {c}</div>
                  ))}
                </div>
              )}
              {gratidoesSemana.length === 0 && conquistasSemana.length === 0 && (
                <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                  Você registrou essa semana. Isso já é muito.
                </div>
              )}
            </div>
          </div>

          {/* Treino stats Rafa */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: modoCuidado && treinoColapsado ? 0 : 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Treino da semana
              </div>
              {modoCuidado && (
                <button type="button" onClick={() => setTreinoColapsado(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9333ea' }}>
                  {treinoColapsado ? 'ver treinos' : 'ocultar'}
                </button>
              )}
            </div>
            {(!modoCuidado || !treinoColapsado) && (
              <div style={{ display: 'flex', gap: 0, alignItems: 'center', flexWrap: 'wrap' }}>
                {[
                  { label: 'Academia', valor: diasAcademiaRafa, cor: '#9333ea' },
                  { label: 'Caminhada', valor: diasCaminhadaRafa, cor: '#8b5cf6' },
                  { label: 'Bike', valor: diasBikeRafa, cor: '#a78bfa' },
                  { label: 'Rendimento', valor: resumo?.rendimentoTreinoMedio ? `${Number(resumo.rendimentoTreinoMedio).toFixed(1)}/5` : '—', cor: '#6366f1', raw: true },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: '1 1 0' }}>
                    {i > 0 && <div style={{ width: 1, height: 40, background: '#2a2d3e', flexShrink: 0 }} />}
                    <div style={{ textAlign: 'center', flex: 1, padding: '4px 12px' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: item.cor }}>
                        {item.raw ? item.valor : `${item.valor}x`}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Cards Leo */}
      {!isRafa && (
        <div className="grid-4">
          <StatCard label="Horas de estudo" value={`${Number(resumo?.totalHorasEstudo ?? 0).toFixed(1)}h`} sub="essa semana" color="#6366f1" />
          <StatCard
            label="Trabalho na Rift"
            value={`${resumo?.totalTicketsRift ?? 0} tickets`}
            sub={`${Number(resumo?.totalHorasTrabalhadas ?? 0).toFixed(1)}h trabalhadas · essa semana`}
            color="#10b981"
          />
          <StatCard
            label="Humor médio"
            value={humorMedio ? `${humorMedio.toFixed(1)}/5` : '—'}
            sub="essa semana"
            color="#f59e0b"
          />
          <StatCard
            label="Dias registrados"
            value={`${resumo?.diasComRegistro ?? 0} dias`}
            sub="essa semana"
            color="#06b6d4"
          />
        </div>
      )}

      {/* Gráficos */}
      <div>
        <h2 className="section-title">Gráficos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

          {!isRafa && (
            <div className="card chart-appear">
              <div className="muted" style={{ marginBottom: 14 }}>Horas de estudo por dia</div>
              {horasData.length === 0
                ? <Empty texto="Nenhum estudo registrado ainda." />
                : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={horasData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                      <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Line type="monotone" dataKey="horas" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} name="Horas" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
            </div>
          )}

          <div className="card chart-appear" style={{ animationDelay: '0.05s' }}>
            <div className="muted" style={{ marginBottom: 14 }}>Humor por dia (semana)</div>
            {humorData.length === 0
              ? <Empty texto="Nenhum registro esta semana." />
              : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={humorData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="humor" fill={isRafa ? '#9333ea' : '#f59e0b'} radius={[4, 4, 0, 0]} name="Humor" />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </div>

          {isRafa && sonoData.length > 0 && (
            <div className="card chart-appear" style={{ animationDelay: '0.1s' }}>
              <div className="muted" style={{ marginBottom: 14 }}>Qualidade do sono por dia</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sonoData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="sono" fill="#818cf8" radius={[4, 4, 0, 0]} name="Sono" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {!isRafa && topicosData.length > 0 && (
            <div className="card chart-appear" style={{ animationDelay: '0.1s' }}>
              <div className="muted" style={{ marginBottom: 14 }}>Tópicos estudados</div>
              <ResponsiveContainer width="100%" height={Math.max(120, topicosData.length * 32)}>
                <BarChart data={topicosData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Horas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Painel Lazer & Hiperfoco — Rafa */}
      {isRafa && lazerData.length > 0 && (
        <div>
          <h2 className="section-title">Lazer & Hiperfoco</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <div className="card chart-appear">
              <div className="muted" style={{ marginBottom: 14 }}>Lazeres por semana (soma de intensidades)</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={lazerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  {lazeresTodos.map((lazer, i) => (
                    <Bar key={lazer} dataKey={lazer} stackId="a" fill={LAZER_CORES[i % LAZER_CORES.length]} radius={i === lazeresTodos.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {aderenciaData.some(d => d.aderencia != null) && (
              <div className="card chart-appear" style={{ animationDelay: '0.05s' }}>
                <div className="muted" style={{ marginBottom: 14 }}>Aderência à rotina (últimas semanas)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={aderenciaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                    <XAxis
                      dataKey="semana"
                      tickFormatter={s => { const d = new Date(s); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; }}
                      tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} formatter={v => v != null ? `${v}%` : '—'} />
                    <Line type="monotone" dataKey="aderencia" stroke="#9333ea" strokeWidth={2} dot={{ r: 4, fill: '#9333ea' }} name="Aderência" connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      <FocoProjetos />
      {isRafa && modoCuidado ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#94a3b8' }}>Rotina semanal</span>
            <button type="button" onClick={() => setRotinaColapsada(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9333ea' }}>
              {rotinaColapsada ? 'ver rotina' : 'ocultar'}
            </button>
          </div>
          {!rotinaColapsada && <div style={{ marginTop: 16 }}><WeeklyGrid /></div>}
        </div>
      ) : (
        <WeeklyGrid />
      )}
      <ProjectTracker />
      <FinancePanel />
      <ExtratoPanel />
      <TrainingPanel />
      <WeeklyReport />
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card">
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Empty({ texto }) {
  return (
    <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="muted" style={{ fontSize: 13 }}>{texto}</p>
    </div>
  );
}
