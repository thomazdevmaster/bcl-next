import type { GameHelpSection } from '@/domains/games/gameHelp.types';

export const TREBLE_NATURALS_1_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Leia a nota na partitura em clave de sol e escolha o nome correto (Dó, Ré, Mi, Fá, Sol, Lá ou Si). A oitava pode variar; vale o nome da nota, não a posição exata no teclado.',
    ],
  },
  {
    heading: 'Níveis',
    list: [
      'Fácil — Mi₄ a Dó₅, só dentro da pauta.',
      'Médio — Ré₄ a Sol₅, pauta um pouco estendida.',
      'Difícil — Dó₄ a Dó₆, com linhas suplementares.',
    ],
  },
  {
    heading: 'Como responder',
    list: [
      'Toque em um dos botões com o nome da nota.',
      'No teclado físico, use as teclas 1 a 7 na ordem dos botões (1 = Dó, 7 = Si).',
    ],
  },
  {
    heading: 'Pontuação',
    list: [
      'Sequência — acertos seguidos no nível atual; zera se errar.',
      'Recorde — maior sequência já feita naquele nível (salvo neste aparelho).',
      'Ao trocar de nível, a sequência zera e o recorde exibido é o daquele nível.',
    ],
  },
  {
    heading: 'Feedback',
    list: [
      'Acerto — toca-se a nota e surge a próxima pergunta.',
      'Erro — som de alerta; a resposta correta aparece no botão antes da próxima nota.',
    ],
  },
];

export const TREBLE_NATURALS_2_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Veja o nome da nota com oitava (ex.: Sol₄) e coloque-a na altura certa da partitura em clave de sol. A resposta precisa bater com a posição exata, incluindo oitava.',
    ],
  },
  {
    heading: 'Níveis',
    list: [
      'Fácil — Mi₄ a Dó₅, só dentro da pauta.',
      'Médio — Ré₄ a Sol₅, pauta um pouco estendida.',
      'Difícil — Dó₄ a Dó₆, com linhas suplementares.',
    ],
  },
  {
    heading: 'No computador',
    list: [
      'Clique na partitura na altura em que a nota deve ficar; a resposta é enviada na hora.',
      'Setas ↑ e ↓ movem a prévia tracejada; Enter confirma a posição.',
    ],
  },
  {
    heading: 'No celular',
    list: [
      'Toque na pauta para mover a nota tracejada (não envia ainda).',
      'Use Subir e Descer para ajustar com precisão.',
      'Toque em Confirmar posição para enviar a resposta.',
    ],
  },
  {
    heading: 'Pontuação e feedback',
    list: [
      'Sequência e recorde funcionam como no Naturais 1, por nível, neste aparelho.',
      'No acerto, toca-se a nota; no erro, sua escolha aparece em vermelho e a correta em verde.',
    ],
  },
];
