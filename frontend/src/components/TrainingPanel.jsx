import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function inicioSemana(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function TrainingPanel() {
  const { usuario } = useAuth();
  const isRafa = usuario === 'rafa';

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 28);
    api.listarRegistros({ inicio: inicio.toISOString() })
      .then(data => setRegistros(data ?? []))
      .catch(() => setRegistros([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="section-title">Análise de treino</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="card" style={{ height: 96, opacity: 0.4 }} />)}
        </div>
      </div>
    );
  }

  const semanaAtual = registros.filter(r => {
    const d = new Date(r.data);
    return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  });

  const diasAcademia = semanaAtual.filter(r => r.treinoTipo === 'academia' || r.treinoTipo === 'ambos').length;
  const diasVolei = semanaAtual.filter(r => r.treinoTipo === 'volei' || r.treinoTipo === 'ambos').length;
  const diasCaminhada = semanaAtual.filter(r => r.treinoTipo === 'caminhada/corrida').length;
  const diasBike = semanaAtual.filter(r => r.treinoTipo === 'bike').length;

  const rendimentos = registros
    .filter(r => r.treinoRendimento != null && r.treinoRendimento > 0)
    .map(r => r.treinoRendimento);
  const rendMedio = rendimentos.length
    ? (rendimentos.reduce((a, b) => a + b, 0) / rendimentos.length).toFixed(1)
    : null;

  const porSemana = {};
  registros.forEach(r => {
    const key = inicioSemana(r.data);
    if (!porSemana[key]) porSemana[key] = { semana: key, academia: 0, atividade2: 0, bike: 0 };
    const tipo = r.treinoTipo;
    if (tipo === 'academia' || tipo === 'ambos') porSemana[key].academia++;
    if (!isRafa && (tipo === 'volei' || tipo === 'ambos')) porSemana[key].atividade2++;
    if (isRafa && tipo === 'caminhada/corrida') porSemana[key].atividade2++;
    if (isRafa && tipo === 'bike') porSemana[key].bike++;
  });
  const chartData = Object.values(porSemana).slice(-4);

  const temRegistroTreino = registros.some(r => r.treinoTipo && r.treinoTipo !== 'nenhum');

  const metaAcademia = isRafa ? 5 : 5;
  const metaAtiv2 = isRafa ? 3 : 2;
  const label2 = isRafa ? 'Caminhada/Corrida' : 'Vôlei';
  const diasAtiv2 = isRafa ? diasCaminhada : diasVolei;

  return (
    <div>
      <h2 className="section-title">Análise de treino</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard
          label={`Academia esta semana`}
          value={`${diasAcademia}/${metaAcademia}`}
          ok={diasAcademia >= metaAcademia}
          semDados={!temRegistroTreino}
        />
        <StatCard
          label={`${label2} esta semana`}
          value={`${diasAtiv2}/${metaAtiv2}`}
          ok={diasAtiv2 >= metaAtiv2}
          semDados={!temRegistroTreino}
        />
        <StatCard
          label="Rendimento médio"
          value={rendMedio ? `${rendMedio}/5` : '—'}
          ok={rendMedio !== null ? Number(rendMedio) >= 3.5 : null}
          semDados={rendMedio === null}
        />
      </div>

      {chartData.length > 0 && (
        <div className="card">
          <div className="muted" style={{ marginBottom: 16, fontSize: 13 }}>Consistência por semana</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
              <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 13 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
              <Bar dataKey="academia" name="Academia" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="atividade2" name={label2} fill="#10b981" radius={[4, 4, 0, 0]} />
              {isRafa && <Bar dataKey="bike" name="Bike" fill="#a78bfa" radius={[4, 4, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!temRegistroTreino && (
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Registre seus treinos no formulário diário para ver os dados aqui.
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, ok, semDados }) {
  const cor = semDados ? '#64748b' : (ok ? '#10b981' : '#f59e0b');
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: cor }}>{value}</div>
      <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{label}</div>
      {!semDados && ok !== null && (
        <div style={{ marginTop: 8, fontSize: 11, color: cor, fontWeight: 600 }}>
          {ok ? 'Meta atingida ✓' : 'Abaixo da meta'}
        </div>
      )}
    </div>
  );
}
