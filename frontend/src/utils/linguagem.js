export function labelMeta(atual, meta, unidade = '') {
  if (atual >= meta) return 'Meta atingida 💜';
  const faltam = meta - atual;
  return `${faltam} ${unidade} a mais esta semana`.trim();
}

export function labelHumor(media) {
  if (media >= 4) return 'Semana leve';
  if (media >= 3) return 'Semana equilibrada';
  if (media >= 2) return 'Foi uma semana pesada';
  return 'Semana muito difícil';
}

export function labelTreino(dias, meta) {
  if (dias >= meta) return 'Meta atingida 💜';
  const faltam = meta - dias;
  return `${faltam} treino${faltam > 1 ? 's' : ''} a mais esta semana`;
}
