import type { GameHelpSection } from '@/domains/games/gameHelp.types';

const LEVELS: GameHelpSection = {
  heading: 'Níveis',
  list: [
    'Fácil — flauta, clarinete, sax alto, trompete, trombone, tuba, caixa e pratos.',
    'Médio — flautim, oboé, fagote, trompa, bombardino, sax tenor, surdo, tímpano e violino.',
    'Difícil — outros saxofones, teclados de percussão e cordas.',
  ],
};

const SCORE: GameHelpSection = {
  heading: 'Pontuação',
  list: [
    'Sequência — acertos seguidos no nível atual; zera se errar.',
    'Recorde — maior sequência daquele nível, salva neste aparelho.',
  ],
};

export const INSTRUMENT_FAMILY_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Leia o nome do instrumento e escolha a família: sopro madeira, sopro metais, percussão ou cordas. O saxofone entra em madeira, mesmo com corpo de metal, porque usa palheta.',
    ],
  },
  LEVELS,
  SCORE,
];

export const INSTRUMENT_METHOD_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Diga como o instrumento produz o som: sopro sem palheta, palheta simples, palheta dupla, bocal, percussão, arco ou cordas dedilhadas.',
    ],
  },
  LEVELS,
  SCORE,
];

export const INSTRUMENT_REGISTER_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Compare a região em que o instrumento costuma tocar. Mais agudo fica mais alto; mais grave, mais baixo. Se a região típica for a mesma, a resposta é Iguais.',
    ],
  },
  LEVELS,
  {
    heading: 'Como responder',
    list: [
      'Toque em Primeiro, Segundo ou Iguais.',
      'No teclado: 1, 2 e 3.',
    ],
  },
  SCORE,
];

export const INSTRUMENT_CLUE_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Leia a pista e descubra qual instrumento ela descreve.',
    ],
  },
  LEVELS,
  {
    heading: 'Como responder',
    list: ['Toque no nome. No teclado, use 1 a 4.'],
  },
  SCORE,
];
