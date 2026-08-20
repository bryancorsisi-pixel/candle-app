export const AREA_NAMES = {
  macro: 'Macroeconomia',
  corp: 'Finanças Corporativas',
  produtos: 'Produtos Financeiros',
  atualidades: 'Atualidades',
};

export const ALL_AREAS = ['macro', 'corp', 'produtos', 'atualidades'];

export const LEVEL_NAMES = {
  conceito: 'Conceito',
  aplicacao: 'Aplicação',
  raciocinio: 'Raciocínio',
  caso: 'Caso / Entrevista',
};

export const ALL_LEVELS = ['conceito', 'aplicacao', 'raciocinio', 'caso'];

export const TEMPO_LABELS = {
  15: 'até 15 minutos por dia',
  30: 'até 30 minutos por dia',
  45: 'até 45 minutos por dia',
  60: 'até 1 hora por dia',
  '60+': 'mais de 1 hora por dia',
};

export const HORARIO_LABELS = {
  '08:00': 'às 8h da manhã',
  '12:00': 'ao meio-dia',
  '16:00': 'às 4h da tarde',
  '20:00': 'às 8h da noite',
};

// Monta a composição do diagnóstico gratuito: quantas perguntas de
// 'conceito' e 'aplicacao' sortear de cada área, com base na área de
// interesse escolhida na triagem. Os níveis 'raciocinio' e 'caso' ficam
// reservados pro treino diário pago (dashboard), não entram no diagnóstico.
export function buildQuizComposition(areaInteresse) {
  const comp = {};
  ALL_AREAS.forEach((a) => (comp[a] = { conceito: 0, aplicacao: 0 }));

  if (areaInteresse && areaInteresse !== 'indefinido' && ALL_AREAS.includes(areaInteresse)) {
    comp[areaInteresse] = { conceito: 2, aplicacao: 2 };
    ALL_AREAS.filter((a) => a !== areaInteresse).forEach((a) => {
      comp[a] = { conceito: 1, aplicacao: 1 };
    });
  } else {
    ALL_AREAS.forEach((a) => (comp[a] = { conceito: 1, aplicacao: 1 }));
  }
  return comp;
}

export function firstName(nomeCompleto) {
  return (nomeCompleto || '').trim().split(/\s+/)[0] || 'você';
}
