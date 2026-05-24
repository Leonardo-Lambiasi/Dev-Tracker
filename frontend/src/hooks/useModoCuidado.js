import { useMemo } from 'react';

export function useModoCuidado(registrosSemana) {
  return useMemo(() => {
    if (!registrosSemana?.length) return false;
    const comHumor = [...registrosSemana]
      .filter(r => r.humor != null)
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .slice(0, 3);
    if (comHumor.length < 2) return false;
    const media = comHumor.reduce((sum, r) => sum + r.humor, 0) / comHumor.length;
    return media <= 2;
  }, [registrosSemana]);
}
