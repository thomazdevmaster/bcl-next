import type { GameHelpSection } from "@/domains/games/gameHelp.types";

const LEVELS: GameHelpSection = {
  heading: "Níveis",
  list: [
    "Fácil — semibreve, mínima e semínima.",
    "Médio — inclui colcheia e pausas de mínima e de semínima.",
    "Difícil — pontos de aumento, semicolcheia e mais pausas.",
  ],
};

const SCORE: GameHelpSection = {
  heading: "Pontuação",
  list: [
    "A contagem vale em compasso 4/4: a semínima dura 1 tempo.",
    "Sequência — acertos seguidos no nível atual; zera se errar.",
    "Recorde — maior sequência daquele nível, salva neste aparelho.",
  ],
};

export const RHYTHM_FIGURES_HELP: GameHelpSection[] = [
  {
    heading: "Objetivo",
    paragraphs: [
      "Veja a figura e ouça quanto tempo ela dura — o som segura até o fim do valor, como um sopro. Depois escolha o nome. Pausas ficam em silêncio pelo tempo delas.",
    ],
  },
  LEVELS,
  {
    heading: "Como responder",
    list: [
      "Toque no nome da figura. No teclado, use 1, 2, 3 e 4 na ordem dos botões.",
      "Ouvir de novo toca a figura outra vez, pelo tempo dela.",
    ],
  },
  SCORE,
];

export const RHYTHM_DURATION_HELP: GameHelpSection[] = [
  {
    heading: "Objetivo",
    paragraphs: [
      "Ouça as duas figuras, uma depois da outra: cada uma soa exatamente o tempo dela. Escolha a mais longa. Uma nota e uma pausa da mesma duração empatam.",
    ],
  },
  LEVELS,
  {
    heading: "Como responder",
    list: [
      "Toque em Esquerda, Direita ou Iguais. No teclado: 1, 2 e 3.",
      "Ouvir de novo toca as duas figuras, cada uma no seu tempo.",
    ],
  },
  SCORE,
];

export const RHYTHM_BAR_HELP: GameHelpSection[] = [
  {
    heading: "Objetivo",
    paragraphs: [
      "O que já está escrito soa pelo tempo de cada figura. O compasso é 4/4 e falta uma figura no fim. Escolha a que completa exatamente 4 tempos.",
    ],
  },
  LEVELS,
  {
    heading: "Como responder",
    list: [
      "Some o que já está escrito e veja quantos tempos faltam.",
      "Toque na figura que preenche o espaço. No teclado, use 1 a 4.",
    ],
  },
  SCORE,
];

export const RHYTHM_HOLD_HELP: GameHelpSection[] = [
  {
    heading: "Objetivo",
    paragraphs: [
      "A pauta passa junto com o metrônomo. Segure o botão pelo tempo da nota e deixe solto nas pausas. O sopro sai enquanto o botão está preso. Entre uma nota e a seguinte há um respiro curto para soltar e apertar de novo. A rodada pode ter vários compassos.",
    ],
  },
  LEVELS,
  {
    heading: "Como responder",
    list: [
      "Toque em Começar. Quando a nota cruzar a linha, aperte Segure e solte no fim do valor. O som começa no aperto e para ao soltar.",
      "Uma semibreve pede o botão preso pelos 4 tempos. A pausa pede o botão solto.",
      "No teclado, segure a barra de espaço.",
    ],
  },
  {
    heading: "Pontuação",
    list: [
      "Cada nota e cada pausa valem 10 pontos. A rodada fácil vale 100, a média 200 e a difícil 500.",
      "Soltar antes do fim da nota desconta na proporção do tempo que faltou.",
      "Segurar além da nota desconta o dobro: o tempo a mais pesa duas vezes.",
      "Na pausa, o tempo em que o botão ficou preso desconta os pontos.",
      "Recorde — maior pontuação daquele nível, salva neste aparelho.",
    ],
  },
];

export const RHYTHM_DICTATION_HELP: GameHelpSection[] = [
  {
    heading: "Objetivo",
    paragraphs: [
      "Ouça um compasso e escolha a pauta que corresponde ao ritmo. O primeiro compasso é só o metrônomo. No seguinte, o metrônomo continua e as notas soam o tempo delas, como um sopro. A pausa fica em silêncio.",
    ],
  },
  LEVELS,
  {
    heading: "Como responder",
    list: [
      "Toque em Ouvir de novo quantas vezes precisar.",
      "Escolha uma das três pautas. No teclado, use 1, 2 e 3.",
    ],
  },
  SCORE,
];
