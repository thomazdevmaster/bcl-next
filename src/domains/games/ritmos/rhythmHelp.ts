import type { GameHelpSection } from '@/domains/games/gameHelp.types';

const LEVELS: GameHelpSection = {
  heading: 'Níveis',
  list: [
    'Fácil — semibreve, mínima e semínima.',
    'Médio — inclui colcheia e pausas de mínima e de semínima.',
    'Difícil — pontos de aumento, semicolcheia e mais pausas.',
  ],
};

const SCORE: GameHelpSection = {
  heading: 'Pontuação',
  list: [
    'A contagem vale em compasso 4/4: a semínima dura 1 tempo.',
    'Sequência — acertos seguidos no nível atual; zera se errar.',
    'Recorde — maior sequência daquele nível, salva neste aparelho.',
  ],
};

export const RHYTHM_FIGURES_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Veja a figura rítmica e escolha o nome. Pausas também entram a partir do nível médio.',
    ],
  },
  LEVELS,
  {
    heading: 'Como responder',
    list: [
      'Toque no nome da figura.',
      'No teclado, use 1, 2, 3 e 4 na ordem dos botões.',
    ],
  },
  SCORE,
];

export const RHYTHM_DURATION_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Compare duas figuras e escolha a que dura mais tempos. Uma nota e uma pausa da mesma duração empatam.',
    ],
  },
  LEVELS,
  {
    heading: 'Como responder',
    list: [
      'Toque em Esquerda, Direita ou Iguais.',
      'No teclado: 1 esquerda, 2 direita, 3 iguais.',
    ],
  },
  SCORE,
];

export const RHYTHM_BAR_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'O compasso está em 4/4 e falta uma figura no fim. Escolha a que completa exatamente 4 tempos.',
    ],
  },
  LEVELS,
  {
    heading: 'Como responder',
    list: [
      'Some o que já está escrito e veja quantos tempos faltam.',
      'Toque na figura que preenche o espaço. No teclado, use 1 a 4.',
    ],
  },
  SCORE,
];

export const RHYTHM_DICTATION_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Ouça um compasso e escolha a pauta que corresponde ao ritmo. Há quatro cliques de contagem antes do ritmo.',
    ],
  },
  LEVELS,
  {
    heading: 'Como responder',
    list: [
      'Toque em Ouvir de novo quantas vezes precisar.',
      'Escolha uma das três pautas. No teclado, use 1, 2 e 3.',
    ],
  },
  SCORE,
];
