import type { GameHelpSection } from '@/domains/games/gameHelp.types';

export const TREBLE_NATURALS_1_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Leia a colcheia na partitura em clave de sol e escolha o nome correto (Dó, Ré, Mi, Fá, Sol, Lá ou Si). A oitava pode variar; vale o nome da nota, não a posição exata no teclado.',
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
      'Veja o nome da nota com oitava (ex.: Sol₄) e coloque a colcheia na altura certa da partitura em clave de sol. A resposta precisa bater com a posição exata, incluindo oitava.',
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

export const TREBLE_HIGHER_NOTE_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Duas colcheias aparecem na clave de sol. Escolha a que está mais aguda — a que soa mais alto, mais para cima na pauta.',
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
      'Toque na nota da esquerda ou da direita, ou use os botões embaixo.',
      'No teclado: seta ← ou 1 escolhe a esquerda; seta → ou 2 escolhe a direita.',
    ],
  },
  {
    heading: 'Pontuação e feedback',
    list: [
      'Sequência e recorde são por nível, salvos neste aparelho.',
      'No acerto, toca a nota mais aguda. No erro, ela fica destacada em verde e a escolha errada em vermelho.',
    ],
  },
];

export const TREBLE_ROTATE_STAFF_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Leia a colcheia de cima e gire a pauta de baixo até a colcheia tracejada cair na linha ou no espaço desse nome. Dó₄, Dó₅ e Dó₆ usam o mesmo encaixe — vale o nome, não a oitava.',
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
      'Esquerda e Direita giram a pauta, um nome por toque (… Si, Dó, Ré, Mi …).',
      'Confirmar envia a posição que está no centro.',
      'No teclado: seta ← e seta → giram; Enter confirma.',
    ],
  },
  {
    heading: 'Pontuação e feedback',
    list: [
      'Sequência e recorde são por nível, salvos neste aparelho.',
      'No acerto, toca a nota lida. No erro, a pauta gira até o encaixe certo e o nome aparece.',
    ],
  },
];

export const TREBLE_LISTEN_WRITE_HELP: GameHelpSection[] = [
  {
    heading: 'Objetivo',
    paragraphs: [
      'Ouça a nota e escreva a colcheia na altura certa da partitura em clave de sol, com a oitava exata. O nome só aparece depois da resposta.',
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
      'Use Ouvir de novo se precisar escutar outra vez.',
      'Clique na partitura na altura da nota; a resposta é enviada na hora.',
      'Setas ↑ e ↓ movem a prévia tracejada; Enter confirma.',
    ],
  },
  {
    heading: 'No celular',
    list: [
      'Toque em Ouvir de novo para repetir o som.',
      'Toque na pauta para mover a colcheia tracejada.',
      'Use Subir e Descer e depois Confirmar posição.',
    ],
  },
  {
    heading: 'Pontuação e feedback',
    list: [
      'Sequência e recorde funcionam por nível, neste aparelho.',
      'No acerto, a nota soa de novo. No erro, a posição certa aparece em verde.',
    ],
  },
];
