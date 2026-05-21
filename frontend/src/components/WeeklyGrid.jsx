import { Fragment, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PERIODOS = ['manha', 'tarde', 'noite'];
const PERIODO_LABEL = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };

const CATEGORIAS = ['estudo', 'trabalho', 'treino', 'pessoal', 'descanso'];
const COR_CAT = {
  estudo:    '#6366f1',
  trabalho:  '#3b82f6',
  treino:    '#10b981',
  pessoal:   '#f59e0b',
  descanso:  '#64748b',
};

function diaSemanaHoje() {
  return new Date().getDay();
}

export default function WeeklyGrid() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null); // { dia, periodo }
  const [abaMobile, setAbaMobile] = useState(diaSemanaHoje());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  // painel de edição
  const [modo, setModo] = useState('ver'); // 'ver' | 'novo' | 'editar'
  const [slotEditando, setSlotEditando] = useState(null);
  const [label, setLabel] = useState('');
  const [categoria, setCategoria] = useState('estudo');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [salvando, setSalvando] = useState(false);

  const painelRef = useRef(null);

  useEffect(() => {
    api.listarRotina()
      .then(d => setSlots(d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleResize() { setIsMobile(window.innerWidth < 600); }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!selecionado) return;
    function handleClick(e) {
      if (painelRef.current && !painelRef.current.contains(e.target)) {
        setSelecionado(null);
        setModo('ver');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selecionado]);

  function slotsEm(dia, periodo) {
    return slots.filter(s => s.diaSemana === dia && s.periodo === periodo);
  }

  function abrirCelula(dia, periodo) {
    setSelecionado({ dia, periodo });
    setModo('ver');
    setSlotEditando(null);
    setLabel('');
    setCategoria('estudo');
    setHoraInicio('');
    setHoraFim('');
  }

  function iniciarNovo() {
    setSlotEditando(null);
    setLabel('');
    setCategoria('estudo');
    setHoraInicio('');
    setHoraFim('');
    setModo('novo');
  }

  function iniciarEditar(slot) {
    setSlotEditando(slot);
    setLabel(slot.label);
    setCategoria(slot.categoria);
    setHoraInicio(slot.horaInicio ?? '');
    setHoraFim(slot.horaFim ?? '');
    setModo('editar');
  }

  async function salvar() {
    if (!label.trim()) return;
    setSalvando(true);
    const body = {
      diaSemana: selecionado.dia,
      periodo: selecionado.periodo,
      label: label.trim(),
      categoria,
      horaInicio: horaInicio || null,
      horaFim: horaFim || null,
    };
    try {
      if (modo === 'novo') {
        const novo = await api.criarSlot(body);
        setSlots(prev => [...prev, novo]);
      } else {
        const atualizado = await api.atualizarSlot(slotEditando.id, body);
        setSlots(prev => prev.map(s => s.id === slotEditando.id ? atualizado : s));
      }
      setModo('ver');
    } catch {
      // silencioso
    } finally {
      setSalvando(false);
    }
  }

  async function deletar(id) {
    try {
      await api.deletarSlot(id);
      setSlots(prev => prev.filter(s => s.id !== id));
    } catch { }
  }

  const hoje = diaSemanaHoje();

  // ---- Mobile: abas por dia ----
  if (isMobile) {
    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #2a2d3e' }}>
          {DIAS.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setAbaMobile(i); setSelecionado(null); }}
              style={{
                flex: '0 0 auto', padding: '10px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: abaMobile === i ? 700 : 400,
                color: abaMobile === i ? 'var(--accent)' : '#64748b',
                borderBottom: abaMobile === i ? '2px solid var(--accent)' : '2px solid transparent',
                position: 'relative',
              }}
            >
              {d}
              {i === hoje && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)',
                }} />
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px 16px 8px' }}>
          {PERIODOS.map(p => (
            <div key={p} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                {PERIODO_LABEL[p]}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {slotsEm(abaMobile, p).map(s => (
                  <SlotChip key={s.id} slot={s} onEdit={() => { abrirCelula(abaMobile, p); iniciarEditar(s); }} onDelete={() => deletar(s.id)} />
                ))}
                <button
                  type="button"
                  onClick={() => { abrirCelula(abaMobile, p); iniciarNovo(); }}
                  style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px dashed var(--accent-bg)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                >
                  + Adicionar
                </button>
              </div>
            </div>
          ))}
        </div>

        {selecionado && (
          <div ref={painelRef} style={{ borderTop: '1px solid #2a2d3e', padding: 16 }}>
            <PainelEdicao
              modo={modo} label={label} setLabel={setLabel}
              categoria={categoria} setCategoria={setCategoria}
              horaInicio={horaInicio} setHoraInicio={setHoraInicio}
              horaFim={horaFim} setHoraFim={setHoraFim}
              salvando={salvando} onSalvar={salvar}
              onCancelar={() => { setModo('ver'); setSelecionado(null); }}
              onNovo={iniciarNovo}
              slotsCell={slotsEm(selecionado.dia, selecionado.periodo)}
              onEditarSlot={iniciarEditar}
              onDeletarSlot={deletar}
            />
          </div>
        )}
      </div>
    );
  }

  // ---- Desktop: grade 7×3 ----
  return (
    <div>
      <h2 className="section-title">Rotina semanal</h2>
      <div style={{
        display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)',
        border: '1px solid #2a2d3e', borderRadius: 12, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: '#0f1117', borderBottom: '1px solid #2a2d3e' }} />
        {DIAS.map((d, i) => (
          <div key={i} style={{
            background: '#0f1117', borderBottom: '1px solid #2a2d3e',
            borderLeft: '1px solid #2a2d3e',
            padding: '10px 8px', textAlign: 'center',
            fontSize: 12, fontWeight: i === hoje ? 700 : 500,
            color: i === hoje ? 'var(--accent)' : '#94a3b8',
          }}>
            {d}
            {i === hoje && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', margin: '4px auto 0' }} />}
          </div>
        ))}

        {/* Rows */}
        {PERIODOS.map(periodo => (
          <Fragment key={periodo}>
            <div style={{
              background: '#0f1117', borderTop: '1px solid #2a2d3e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px 4px',
              fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
            }}>
              {PERIODO_LABEL[periodo]}
            </div>

            {DIAS.map((_, diaIdx) => {
              const sel = selecionado?.dia === diaIdx && selecionado?.periodo === periodo;
              const celSlots = slotsEm(diaIdx, periodo);
              return (
                <div
                  key={`cell-${diaIdx}-${periodo}`}
                  onClick={() => abrirCelula(diaIdx, periodo)}
                  style={{
                    borderTop: '1px solid #2a2d3e', borderLeft: '1px solid #2a2d3e',
                    minHeight: 72, padding: 6, cursor: 'pointer',
                    background: sel ? 'var(--accent-bg)' : 'transparent',
                    outline: sel ? '2px solid var(--accent)' : 'none',
                    outlineOffset: -2,
                    transition: 'background 0.1s',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}
                >
                  {celSlots.map(s => (
                    <SlotChip key={s.id} slot={s} compact />
                  ))}
                  {celSlots.length === 0 && (
                    <span style={{ fontSize: 10, color: '#2a2d3e', margin: 'auto' }}>+</span>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

      {/* Painel de detalhe abaixo da grade */}
      {selecionado && (
        <div ref={painelRef} className="card" style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: '#94a3b8' }}>
            {DIAS[selecionado.dia]} — {PERIODO_LABEL[selecionado.periodo]}
          </div>
          <PainelEdicao
            modo={modo} label={label} setLabel={setLabel}
            categoria={categoria} setCategoria={setCategoria}
            horaInicio={horaInicio} setHoraInicio={setHoraInicio}
            horaFim={horaFim} setHoraFim={setHoraFim}
            salvando={salvando} onSalvar={salvar}
            onCancelar={() => { setModo('ver'); setSelecionado(null); }}
            onNovo={iniciarNovo}
            slotsCell={slotsEm(selecionado.dia, selecionado.periodo)}
            onEditarSlot={iniciarEditar}
            onDeletarSlot={deletar}
          />
        </div>
      )}

      {loading && <div className="card" style={{ opacity: 0.3, height: 60, marginTop: 8 }} />}
    </div>
  );
}

function SlotChip({ slot, compact, onEdit, onDelete }) {
  const cor = COR_CAT[slot.categoria] ?? '#6366f1';
  if (compact) {
    return (
      <div style={{
        background: `${cor}20`, border: `1px solid ${cor}50`,
        borderRadius: 4, padding: '2px 6px', fontSize: 10, color: cor,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {slot.label}
      </div>
    );
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: `${cor}15`, border: `1px solid ${cor}40`,
      borderRadius: 6, padding: '6px 10px', gap: 8,
    }}>
      <div>
        <span style={{ fontSize: 13, color: cor, fontWeight: 500 }}>{slot.label}</span>
        {(slot.horaInicio || slot.horaFim) && (
          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
            {slot.horaInicio}{slot.horaFim ? `–${slot.horaFim}` : ''}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {onEdit && (
          <button type="button" onClick={e => { e.stopPropagation(); onEdit(slot); }}
            style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Editar
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={e => { e.stopPropagation(); onDelete(slot.id); }}
            style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function PainelEdicao({
  modo, label, setLabel, categoria, setCategoria,
  horaInicio, setHoraInicio, horaFim, setHoraFim,
  salvando, onSalvar, onCancelar, onNovo,
  slotsCell, onEditarSlot, onDeletarSlot,
}) {
  if (modo === 'ver') {
    return (
      <div>
        {slotsCell.length === 0 && (
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Nenhum slot neste período.</p>
        )}
        {slotsCell.map(s => (
          <SlotChip key={s.id} slot={s} onEdit={onEditarSlot} onDelete={onDeletarSlot} />
        ))}
        <button type="button" className="btn btn-secondary" style={{ marginTop: 10, fontSize: 13 }} onClick={onNovo}>
          + Novo slot
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>
        {modo === 'novo' ? 'Novo slot' : 'Editar slot'}
      </div>
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div className="field">
          <label>Descrição</label>
          <input
            autoFocus
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSalvar()}
            placeholder="ex: Estudar C#"
          />
        </div>
        <div className="field">
          <label>Categoria</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIAS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: '1px solid',
                  borderColor: categoria === c ? COR_CAT[c] : '#2a2d3e',
                  background: categoria === c ? `${COR_CAT[c]}20` : 'transparent',
                  color: categoria === c ? COR_CAT[c] : '#94a3b8',
                  cursor: 'pointer', fontSize: 12,
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label>Hora início</label>
          <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
        </div>
        <div className="field">
          <label>Hora fim</label>
          <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-primary" onClick={onSalvar} disabled={salvando || !label.trim()}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
