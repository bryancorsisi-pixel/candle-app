export const AREA_NAMES = {
  macro: 'Macroeconomia',
  corp: 'Finanças Corporativas',
  produtos: 'Produtos Financeiros',
  atualidades: 'Atualidades',
};

export const ALL_AREAS = ['macro', 'corp', 'produtos', 'atualidades'];

export const TEMPO_LABELS = {
  '15': 'até 15 minutos por dia',
  '30': 'até 30 minutos por dia',
  '45': 'até 45 minutos por dia',
  '60': 'até 1 hora por dia',
  '60+': 'mais de 1 hora por dia',
};

export const HORARIO_LABELS = {
  '08:00': 'às 8h da manhã',
  '12:00': 'ao meio-dia',
  '16:00': 'às 4h da tarde',
  '20:00': 'às 8h da noite',
};

// Monta a composição do diagnóstico: quantas perguntas básicas/avançadas
// sortear de cada área, com base na área de interesse do usuário.
export function buildQuizComposition(areaInteresse) {
  const comp = {};
  ALL_AREAS.forEach((a) => (comp[a] = { basica: 0, avancada: 0 }));

  if (areaInteresse && areaInteresse !== 'indefinido' && ALL_AREAS.includes(areaInteresse)) {
    comp[areaInteresse].basica = 2;
    comp[areaInteresse].avancada = 2;
    ALL_AREAS.filter((a) => a !== areaInteresse).forEach((a) => {
      comp[a].avancada = 2;
    });
  } else {
    comp.macro = { basica: 1, avancada: 2 };
    comp.corp = { basica: 1, avancada: 2 };
    comp.produtos = { basica: 0, avancada: 2 };
    comp.atualidades = { basica: 0, avancada: 2 };
  }
  return comp;
}
