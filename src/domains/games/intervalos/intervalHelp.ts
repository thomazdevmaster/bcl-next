import type { GameHelpSection } from '@/domains/games/gameHelp.types';

const LEVELS: GameHelpSection = {
  heading: 'Níveis',
  list: [
    'Fácil — 2ª maior, 3ª maior, 4ª justa, 5ª justa e 8ª justa.',
    'Médio — entram 2ª menor, 3ª menor e as 6ªs.',
    'Difícil — 7ªs e o trítono (4ª aumentada e 5ª diminuta).',
  ],
};

const SCORE: GameHelpSection = {
  heading: 'Pontuação',
  list: [
    'Os intervalos sobem, entre notas naturais da clave de sol.',
    'Sequência — acertos seguidos no nível atual; zera se errar.',
    'Recorde — maior sequência daquele nível, salva neste aparelho.',
  ],
};

export const INTERVAL_NAME_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Leia as duas colcheias e diga o intervalo ascendente: o número (2ª, 3ª…) e a qualidade (menor, maior, justa, aumentada ou diminuta).',
    ],
  },
  LEVELS,
  {
    heading: 'Como responder',
    list: [
      'Toque no nome do intervalo.',
      'No teclado, use 1 a 4 na ordem dos botões.',
    ],
  },
  SCORE,
];

export const INTERVAL_COMPARE_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Veja dois intervalos e escolha o mais largo, isto é, o que tem mais semitons. Se a distância em semitons for a mesma, a resposta é Iguais.',
    ],
  },
  LEVELS,
  {
    heading: 'Como responder',
    list: [
      'Toque em Primeiro, Segundo ou Iguais.',
      'No teclado: 1 primeiro, 2 segundo, 3 iguais.',
    ],
  },
  SCORE,
];

export const INTERVAL_LISTEN_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Ouça duas notas, a grave e depois a aguda, e reconheça o intervalo. A pauta só aparece depois da resposta.',
    ],
  },
  LEVELS,
  {
    heading: 'Como responder',
    list: [
      'Toque em Ouvir de novo se precisar.',
      'Escolha o nome. No teclado, use 1 a 4.',
    ],
  },
  SCORE,
];

export const INTERVAL_WRITE_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'A nota de baixo já está na pauta. Escreva a colcheia de cima no intervalo pedido.',
    ],
  },
  LEVELS,
  {
    heading: 'No computador',
    list: [
      'Clique na altura da nota de cima. A resposta vale na hora.',
      'Setas ↑ e ↓ movem a prévia; Enter confirma.',
    ],
  },
  {
    heading: 'No celular',
    list: [
      'Toque na pauta para posicionar a nota tracejada.',
      'Use Subir e Descer e depois Confirmar posição.',
    ],
  },
  SCORE,
];
