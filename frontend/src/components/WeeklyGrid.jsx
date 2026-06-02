import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

function getMondayISO(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PERIODOS = ['manha', 'tarde', 'noite'];
const PERIODO_LABEL = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };

const CATEGORIAS = ['trabalho', 'estudo', 'treino', 'projeto', 'descanso', 'registro', 'outro'];
const COR_CAT = {
  trabalho:  '#3b82f6',
  estudo:    '#6366f1',
  treino:    '#10b981',
  projeto:   '#8b5cf6',
  descanso:  '#64748b',
  registro:  '#f59e0b',
  outro:     '#94a3b8',
};

function diaSemanaHoje() {
  return new Date().getDay();
}

export default function WeeklyGrid() {
  const [slots, setSlots] = useState([]);
  const [checkins, setCheckins] = useState({}); // slotId → status
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null); // { dia, periodo }
  const [abaMobile, setAbaMobile] = useState(diaSemanaHoje());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const semanaAtual = getMondayISO();

  // painel de edição
  const [modo, setModo] = useState('ver'); // 'ver' | 'novo' | 'editar'
  const [slotEditando, setSlotEditando] = useState(null);
  const [label, setLabel] = useState('');
  const [categoria, setCategoria] = useState('estudo');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [diasRecorrentes, setDiasRecorrentes] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState('');

  // escolha para slots virtuais (recorrentes)
  const [recorrenteChoice, setRecorrenteChoice] = useState(null);

  const painelRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.listarRotina(),
      api.getCheckins(semanaAtual),
    ])
      .then(([s, cs]) => {
        setSlots(s ?? []);
        const map = {};
        (cs ?? []).forEach(c => { map[c.slotId] = c.status; });
        setCheckins(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [semanaAtual]);

  // slotId efetivo para checkin: virtual slots usam o id do original
  function effectiveCheckinId(slot) {
    return slot.recorrenteOriginalId ?? slot.id;
  }

  const toggleCheckin = useCallback(async (slot, statusAtual) => {
    const effectiveId = slot.recorrenteOriginalId ?? slot.id;
    let novoStatus;
    if (statusAtual === 'feito') novoStatus = 'nao_feito';
    else if (statusAtual === 'nao_feito') novoStatus = null;
    else novoStatus = 'feito';

    setCheckins(prev => ({ ...prev, [effectiveId]: novoStatus }));
    try {
      await api.upsertCheckin(effectiveId, { semana: semanaAtual, status: novoStatus ?? '' });
    } catch {
      setCheckins(prev => ({ ...prev, [effectiveId]: statusAtual }));
    }
  }, [semanaAtual]);

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
        setRecorrenteChoice(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selecionado]);

  function slotsEm(dia, periodo) {
    return slots.filter(s => s.diaSemana === dia && s.periodo === periodo);
  }

  function resetForm() {
    setLabel('');
    setCategoria('estudo');
    setHoraInicio('');
    setHoraFim('');
    setIsRecorrente(false);
    setDiasRecorrentes([]);
    setErroSalvar('');
    setRecorrenteChoice(null);
  }

  function abrirCelula(dia, periodo) {
    setSelecionado({ dia, periodo });
    setModo('ver');
    setSlotEditando(null);
    resetForm();
  }

  function iniciarNovo() {
    setSlotEditando(null);
    resetForm();
    setModo('novo');
  }

  function iniciarEditar(slot) {
    if (slot.isVirtual) {
      setRecorrenteChoice(slot);
      setModo('ver');
      return;
    }
    setSlotEditando(slot);
    setLabel(slot.label);
    setCategoria(slot.categoria);
    setHoraInicio(slot.horaInicio ?? '');
    setHoraFim(slot.horaFim ?? '');
    setIsRecorrente(slot.isRecorrente ?? false);
    setDiasRecorrentes(slot.diasRecorrentes ?? []);
    setErroSalvar('');
    setRecorrenteChoice(null);
    setModo('editar');
  }

  function escolherSoEste() {
    if (!recorrenteChoice || !selecionado) return;
    setSlotEditando(null);
    setLabel(recorrenteChoice.label);
    setCategoria(recorrenteChoice.categoria);
    setHoraInicio(recorrenteChoice.horaInicio ?? '');
    setHoraFim(recorrenteChoice.horaFim ?? '');
    setIsRecorrente(false);
    setDiasRecorrentes([]);
    setErroSalvar('');
    setRecorrenteChoice(null);
    setModo('novo');
  }

  function escolherTodosRecorrentes() {
    if (!recorrenteChoice) return;
    const original = slots.find(s => s.id === recorrenteChoice.recorrenteOriginalId);
    if (original) {
      setSelecionado({ dia: original.diaSemana, periodo: original.periodo });
      setSlotEditando(original);
      setLabel(original.label);
      setCategoria(original.categoria);
      setHoraInicio(original.horaInicio ?? '');
      setHoraFim(original.horaFim ?? '');
      setIsRecorrente(original.isRecorrente ?? false);
      setDiasRecorrentes(original.diasRecorrentes ?? []);
      setErroSalvar('');
      setRecorrenteChoice(null);
      setModo('editar');
    }
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
      isRecorrente,
      diasRecorrentes: isRecorrente ? diasRecorrentes : [],
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
    } catch (err) {
      setErroSalvar(err?.message?.startsWith('HTTP') ? 'Erro ao salvar. Tente novamente.' : (err?.message ?? 'Erro ao salvar.'));
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
              onClick={() => { setAbaMobile(i); setSelecionado(null); setRecorrenteChoice(null); }}
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
                  <SlotChip
                    key={`${s.id}-${s.diaSemana}`}
                    slot={s}
                    checkinStatus={checkins[effectiveCheckinId(s)]}
                    onEdit={() => { abrirCelula(abaMobile, p); iniciarEditar(s); }}
                    onDelete={s.isVirtual ? undefined : () => deletar(s.id)}
                  />
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
              isRecorrente={isRecorrente} setIsRecorrente={setIsRecorrente}
              diasRecorrentes={diasRecorrentes} setDiasRecorrentes={setDiasRecorrentes}
              salvando={salvando} onSalvar={salvar} erro={erroSalvar}
              onCancelar={() => { setModo('ver'); setSelecionado(null); setRecorrenteChoice(null); }}
              onNovo={iniciarNovo}
              slotsCell={slotsEm(selecionado.dia, selecionado.periodo)}
              onEditarSlot={iniciarEditar}
              onDeletarSlot={deletar}
              checkins={checkins}
              onToggleCheckin={toggleCheckin}
              effectiveCheckinId={effectiveCheckinId}
              recorrenteChoice={recorrenteChoice}
              onEscolherSoEste={escolherSoEste}
              onEscolherTodos={escolherTodosRecorrentes}
              onCancelarChoice={() => setRecorrenteChoice(null)}
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
                    <SlotChip
                      key={`${s.id}-${s.diaSemana}`}
                      slot={s}
                      compact
                      checkinStatus={checkins[effectiveCheckinId(s)]}
                    />
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
            isRecorrente={isRecorrente} setIsRecorrente={setIsRecorrente}
            diasRecorrentes={diasRecorrentes} setDiasRecorrentes={setDiasRecorrentes}
            salvando={salvando} onSalvar={salvar} erro={erroSalvar}
            onCancelar={() => { setModo('ver'); setSelecionado(null); setRecorrenteChoice(null); }}
            onNovo={iniciarNovo}
            slotsCell={slotsEm(selecionado.dia, selecionado.periodo)}
            onEditarSlot={iniciarEditar}
            onDeletarSlot={deletar}
            checkins={checkins}
            onToggleCheckin={toggleCheckin}
            effectiveCheckinId={effectiveCheckinId}
            recorrenteChoice={recorrenteChoice}
            onEscolherSoEste={escolherSoEste}
            onEscolherTodos={escolherTodosRecorrentes}
            onCancelarChoice={() => setRecorrenteChoice(null)}
          />
        </div>
      )}

      {loading && <div className="card" style={{ opacity: 0.3, height: 60, marginTop: 8 }} />}
    </div>
  );
}

const STATUS_COR = { feito: '#22c55e', nao_feito: '#ef4444' };
const STATUS_LABEL = { feito: '✓', nao_feito: '✗' };

function SlotChip({ slot, compact, checkinStatus, onEdit, onDelete, onToggleCheckin }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cor = COR_CAT[slot.categoria] ?? '#6366f1';
  const isRec = slot.isVirtual || slot.isRecorrente;

  const borderStyle = slot.isVirtual
    ? `1.5px dashed ${cor}80`
    : slot.isRecorrente
      ? `1px dashed ${cor}60`
      : `1px solid ${cor}50`;

  if (compact) {
    return (
      <div style={{
        background: `${cor}20`,
        border: borderStyle,
        borderRadius: 4, padding: '2px 6px', fontSize: 10, color: cor,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        display: 'flex', alignItems: 'center', gap: 3,
      }}>
        {checkinStatus && (
          <span style={{ color: STATUS_COR[checkinStatus], fontWeight: 700, fontSize: 9 }}>
            {STATUS_LABEL[checkinStatus]}
          </span>
        )}
        {isRec && <span style={{ fontSize: 9, opacity: 0.7 }}>↻</span>}
        {slot.label}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: `${cor}15`,
      border: borderStyle,
      borderRadius: 6, padding: '6px 10px', gap: 8, marginBottom: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isRec && (
          <span style={{ fontSize: 11, color: cor, opacity: 0.7 }} title={slot.isVirtual ? 'Cópia recorrente' : 'Slot recorrente'}>↻</span>
        )}
        <div>
          <span style={{ fontSize: 13, color: cor, fontWeight: 500 }}>{slot.label}</span>
          {(slot.horaInicio || slot.horaFim) && (
            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
              {slot.horaInicio}{slot.horaFim ? `–${slot.horaFim}` : ''}
            </span>
          )}
          {slot.isVirtual && (
            <span style={{ fontSize: 10, color: '#64748b', marginLeft: 6 }}>recorrente</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {onToggleCheckin && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onToggleCheckin(slot, checkinStatus); }}
            title={checkinStatus === 'feito' ? 'Marcar como não feito' : checkinStatus === 'nao_feito' ? 'Limpar marcação' : 'Marcar como feito'}
            style={{
              fontSize: 13, fontWeight: 700,
              color: checkinStatus ? STATUS_COR[checkinStatus] : '#475569',
              background: checkinStatus ? `${STATUS_COR[checkinStatus]}15` : 'transparent',
              border: `1px solid ${checkinStatus ? STATUS_COR[checkinStatus] + '50' : '#2a2d3e'}`,
              borderRadius: 6, cursor: 'pointer', padding: '2px 8px', minWidth: 28,
            }}
          >
            {checkinStatus ? STATUS_LABEL[checkinStatus] : '○'}
          </button>
        )}
        {onEdit && !confirmDelete && (
          <button type="button" onClick={e => { e.stopPropagation(); onEdit(slot); }}
            style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {slot.isVirtual ? 'Editar...' : 'Editar'}
          </button>
        )}
        {onDelete && !confirmDelete && (
          <button type="button" onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
            style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            ×
          </button>
        )}
        {onDelete && confirmDelete && (
          <>
            <button type="button" onClick={e => { e.stopPropagation(); onDelete(slot.id); }}
              style={{ fontSize: 11, color: '#ef4444', background: '#ef444420', border: '1px solid #ef444440', borderRadius: 4, cursor: 'pointer', padding: '2px 6px' }}>
              Confirmar
            </button>
            <button type="button" onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
              style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PainelEdicao({
  modo, label, setLabel, categoria, setCategoria,
  horaInicio, setHoraInicio, horaFim, setHoraFim,
  isRecorrente, setIsRecorrente, diasRecorrentes, setDiasRecorrentes,
  salvando, onSalvar, onCancelar, onNovo, erro,
  slotsCell, onEditarSlot, onDeletarSlot,
  checkins, onToggleCheckin, effectiveCheckinId,
  recorrenteChoice, onEscolherSoEste, onEscolherTodos, onCancelarChoice,
}) {
  // Diálogo de escolha para slots virtuais
  if (recorrenteChoice) {
    return (
      <div>
        <div style={{
          background: '#6366f115', border: '1px solid #6366f130',
          borderRadius: 8, padding: '12px 14px', marginBottom: 14,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc', marginBottom: 4 }}>
            ↻ &nbsp;{recorrenteChoice.label}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Este slot repete toda semana. O que deseja fazer?
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} onClick={onEscolherSoEste}>
            Editar só este dia
          </button>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={onEscolherTodos}>
            Editar todos os recorrentes
          </button>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 13, color: '#64748b' }} onClick={onCancelarChoice}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (modo === 'ver') {
    return (
      <div>
        {slotsCell.length === 0 && (
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Nenhum slot neste período.</p>
        )}
        {slotsCell.map(s => (
          <SlotChip
            key={`${s.id}-${s.diaSemana}`}
            slot={s}
            checkinStatus={checkins?.[effectiveCheckinId(s)]}
            onEdit={onEditarSlot}
            onDelete={s.isVirtual ? undefined : onDeletarSlot}
            onToggleCheckin={onToggleCheckin}
          />
        ))}
        <button type="button" className="btn btn-secondary" style={{ marginTop: 10, fontSize: 13 }} onClick={onNovo}>
          + Novo slot
        </button>
      </div>
    );
  }

  function toggleDia(i) {
    setDiasRecorrentes(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  }

  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: isRecorrente && modo === 'editar' ? 6 : 14 }}>
        {modo === 'novo' ? 'Novo slot' : 'Editar slot'}
      </div>
      {isRecorrente && modo === 'editar' && (
        <div style={{
          fontSize: 11, color: '#6366f1', background: '#6366f110',
          border: '1px solid #6366f130', borderRadius: 6,
          padding: '5px 10px', marginBottom: 12,
        }}>
          ↻ Editando template recorrente — alterações afetam todos os dias em que aparece
        </div>
      )}
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div className="field">
          <label>Descrição</label>
          <input
            autoFocus
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSalvar()}
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

      {/* Recorrência */}
      <div className="field" style={{ marginTop: 4 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={isRecorrente}
            onChange={e => {
              setIsRecorrente(e.target.checked);
              if (!e.target.checked) setDiasRecorrentes([]);
            }}
            style={{ width: 14, height: 14, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13 }}>↻ Repetir toda semana</span>
        </label>

        {isRecorrente && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
              Marque os dias em que este slot deve aparecer:
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DIAS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDia(i)}
                  style={{
                    padding: '5px 10px', borderRadius: 6, border: '1px solid',
                    borderColor: diasRecorrentes.includes(i) ? 'var(--accent)' : '#2a2d3e',
                    background: diasRecorrentes.includes(i) ? 'var(--accent-bg)' : 'transparent',
                    color: diasRecorrentes.includes(i) ? 'var(--accent)' : '#64748b',
                    cursor: 'pointer', fontSize: 12, fontWeight: diasRecorrentes.includes(i) ? 600 : 400,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
            {diasRecorrentes.length === 0 && (
              <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 6 }}>
                Selecione ao menos um dia para a recorrência.
              </div>
            )}
          </div>
        )}
      </div>

      {erro && (
        <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 10 }}>{erro}</p>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSalvar}
          disabled={salvando || !label.trim() || (isRecorrente && diasRecorrentes.length === 0)}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
