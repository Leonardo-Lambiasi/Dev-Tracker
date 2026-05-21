const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5145/api').replace(/\/$/, '');

function getToken() {
  return localStorage.getItem('tracker_token');
}

async function req(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('tracker_token');
    localStorage.removeItem('tracker_user');
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  login: (usuario, senha) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha }),
    }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),

  criarRegistro:      (body)     => req('/registros', { method: 'POST', body: JSON.stringify(body) }),
  listarRegistros:    (params)   => req(`/registros?${new URLSearchParams(params ?? {})}`),
  getSemana:          ()         => req('/registros/semana'),
  getResumo:          (params)   => req(`/registros/resumo?${new URLSearchParams(params ?? {})}`),
  deletarRegistro:    (id)       => req(`/registros/${id}`, { method: 'DELETE' }),

  listarProjetos:     ()         => req('/projetos'),
  criarProjeto:       (body)     => req('/projetos', { method: 'POST', body: JSON.stringify(body) }),
  atualizarProjeto:   (id, body) => req(`/projetos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletarProjeto:     (id)       => req(`/projetos/${id}`, { method: 'DELETE' }),

  listarMetas:        ()         => req('/metas'),
  criarMeta:          (body)     => req('/metas', { method: 'POST', body: JSON.stringify(body) }),
  atualizarMeta:      (id, body) => req(`/metas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletarMeta:        (id)       => req(`/metas/${id}`, { method: 'DELETE' }),

  gerarAnalise:       ()         => req('/analise/gerar', { method: 'POST' }),
  getUltimaAnalise:   ()         => req('/analise/ultima'),
  getHistoricoAnalise:()         => req('/analise/historico'),

  analisarExtrato:    (extrato)  => req('/financeiro/analisar-extrato', { method: 'POST', body: JSON.stringify({ extrato }) }),
  getHistoricoFinanceiro: ()     => req('/analise/historico?tipo=financeiro'),

  listarRotina:       ()         => req('/rotina'),
  criarSlot:          (body)     => req('/rotina', { method: 'POST', body: JSON.stringify(body) }),
  atualizarSlot:      (id, body) => req(`/rotina/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletarSlot:        (id)       => req(`/rotina/${id}`, { method: 'DELETE' }),
};
