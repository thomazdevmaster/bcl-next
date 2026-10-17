---
name: Banda Carmelitana Luminarense
description: Identidade visual do portal, da gestão e do estudo musical da BCL.
colors:
  brand-cyan: "#00c2ce"
  brand-cyan-strong: "#00a8b3"
  brand-cyan-soft: "#e6fafb"
  ink-navy: "#0b1c2c"
  ink-soft: "#243447"
  mist: "#f4f7fa"
  white: "#ffffff"
  muted: "#5b6b7c"
  border: "#d7e0e8"
  secondary: "#e8eef3"
  danger: "#dc2626"
  dark-background: "#07131e"
  dark-brand-cyan: "#2ad4de"
  dark-card: "#0f2233"
  dark-border: "#1c354a"
  score-canvas: "#eef3f7"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.2em"
rounded:
  sm: "0.375rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.brand-cyan}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.xl}"
    padding: "1rem"
---

# Design System: Banda Carmelitana Luminarense

## Overview

**Creative North Star: “Portal, gestão e estudo em uma só identidade”**

A identidade documentada aqui é a que o código já implementa: uma base institucional em navy e superfícies claras, com ciano como sinal de ação e destaque. O README descreve a paleta de referência como ciano e navy e aponta inspiração no site Drone CI; isso é uma referência de cor, não uma instrução para copiar sua interface.

O sistema atende ao portal público, à gestão e ao estudo de música. No portal e na gestão, tipografia sem serifa, hierarquia direta, cartões e controles familiares mantêm a leitura objetiva. No estudo, a partitura preserva uma página branca sobre um canvas claro mesmo quando a interface está em tema escuro. O tema claro é o padrão inicial; há também tema escuro selecionável.

**Key Characteristics:**
- Ciano de marca sobre navy profundo.
- Superfícies claras e cartões com contorno sutil.
- Tipografia Inter, hierarquia compacta e títulos sem serifa.
- Tema claro e escuro; canvas da partitura constante.

## Colors

A paleta usa um acento ciano, navy para estrutura e texto, e neutros azulados para superfícies, bordas e conteúdo secundário. Os tokens em frontmatter descrevem a paleta principal; tokens de tema escuro e estados adicionais permanecem especificados em `src/core/theme/tokens.css`.

### Primary
- **Ciano de marca** (`#00c2ce`): ação principal, foco e estados selecionados no tema claro.
- **Ciano de ação** (`#00a8b3`): links e texto de ação que precisam de maior contraste sobre superfície clara.

### Secondary
- **Ciano névoa** (`#e6fafb`): fundo de realce discreto no tema claro.

### Neutral
- **Navy tinta** (`#0b1c2c`): texto principal, cabeçalho, navegação lateral e identidade estrutural.
- **Navy suave** (`#243447`): variação de tinta para conteúdo secundário.
- **Névoa clara** (`#f4f7fa`): fundo geral claro.
- **Branco** (`#ffffff`): cartões, campos e superfícies elevadas no tema claro.
- **Cinza azulado** (`#5b6b7c`): texto auxiliar.
- **Borda azulada** (`#d7e0e8`): contornos e divisores no tema claro.
- **Cinza secundário** (`#e8eef3`): controles e áreas secundárias.
- **Vermelho destrutivo** (`#dc2626`): ações destrutivas e seus estados associados.
- **Fundo noturno** (`#07131e`), **ciano noturno** (`#2ad4de`), **cartão noturno** (`#0f2233`) e **borda noturna** (`#1c354a`): equivalentes estruturais usados no tema escuro.
- **Home:** texto de ação em ciano escurecido no tema claro (`#007781`) e ciano luminoso no tema escuro (`#2ad4de`). O CTA compartilha a superfície de cartão e as cores semânticas de texto do bloco do blog nos dois temas.
- **Canvas da partitura** (`#eef3f7`): área de trabalho clara do estudo, independente do tema da interface.

**The Token Source Rule.** Cores de interface devem vir dos tokens de `src/core/theme/tokens.css`; preservar a exceção explícita da partitura, que mantém o papel claro nos dois temas.

## Typography

**Display Font:** Inter (com fallback de sistema sans-serif)  
**Body Font:** Inter (com fallback de sistema sans-serif)  
**Label/Mono Font:** interface sans-serif para rótulos; pilha monospace de sistema para código.

**Character:** sem serifa, legível e funcional. Os títulos usam pesos médios ou semibold e tracking ligeiramente apertado; o corpo parte de 16px com entrelinha confortável.

### Hierarchy
- **Display** (600, 36px): títulos maiores de páginas no desktop.
- **Headline** (600, 30–36px, entrelinha compacta): cabeçalhos de página, reduzindo para 30px em telas menores.
- **Title** (600, 24px): títulos de seção.
- **Body** (400, 16px, line-height 1.6): leitura e formulários.
- **Label** (500, 12px, tracking 0.2em, maiúsculas): identificadores curtos e eyebrow do cabeçalho público.

**The Inter Rule.** Use a pilha sans-serif global; a pilha serif existe como token editorial disponível, mas não é a tipografia padrão do sistema.

## Layout

O portal alinha conteúdo a um container central de até 72rem (1152px), com gutters que aumentam em telas maiores. Navegação pública horizontal aparece em desktop; em telas estreitas, vira menu lateral. A gestão reorganiza a navegação para uso interno e suas tabelas podem rolar horizontalmente.

O ritmo usa a escala utilitária recorrente de 4px e múltiplos: 8px, 16px, 24px e 32px. Componentes empilham em coluna em telas pequenas e passam a linhas ou colunas a partir dos breakpoints responsivos do Tailwind (640px, 768px e 1024px, conforme o componente). Fluxos de estudo e diálogo respeitam a viewport móvel e as áreas seguras do dispositivo.

**The Narrow-Screen Rule.** Projetar para cerca de 360px e expandir progressivamente; alvos de toque devem manter ao menos 44px conforme as instruções do produto.

## Elevation & Depth

O sistema combina contornos finos com uma sombra suave em cartões e painéis. A sombra é ambiente e discreta; navegação e hierarquia também usam blocos tonais de navy e superfícies de cartão. No tema escuro, a sombra cresce em opacidade para continuar separando planos.

### Shadow Vocabulary
- **Sombra suave** (`0 10px 30px rgba(11, 28, 44, 0.08)`): cartões, painéis e menus sobre a superfície clara.
- **Sombra noturna** (`0 10px 30px rgba(0, 0, 0, 0.35)`): a mesma função no tema escuro.

**The Subtle Elevation Rule.** Use sombra junto a contorno ou mudança de superfície para separar cartões; não dependa apenas da sombra para definir limites.

## Shapes

Controles e superfícies usam cantos arredondados moderados: botões utilitários têm 6px; campos e painéis gerais usam 12px; cartões e painéis de estudo recorrentes chegam a 16–24px. Navegação pública selecionada e controles compactos também usam formato circular. Bordas finas definem campos, cartões e divisões.

## Components

### Buttons
- **Caráter:** controles de ação compactos, com texto direto e estados perceptíveis.
- **Primary:** fundo ciano e texto navy, raio de 6px, padding de 8px por 16px; hover reduz opacidade, eleva 1px e adiciona sombra ciano.
- **Secondary:** fundo neutro secundário e texto navy, mesma forma e padding do primário.
- **Outline:** fundo transparente e contorno de 2px; hover preenche com o acento na variante primária.
- **Focus / disabled:** foco visível com contorno de 2px e offset de 2px nas variantes de botão; desabilitado reduz opacidade e remove movimento.

### Cards / Containers
- **Corner Style:** 12px em cartões de gestão compactos; 16px em cartões públicos recorrentes; 24px em superfícies amplas de estudo.
- **Background:** superfície de cartão, com borda azulada fina.
- **Shadow Strategy:** sombra suave como apoio à separação tonal.
- **Internal Padding:** normalmente 16px, com aumento em superfícies de destaque.

### Inputs / Fields
- Fundo branco no tema claro, borda de 1px e raio de 12px; padding horizontal de 12px e vertical de 8px.
- Usar rótulo associado ao campo. Foco é indicado pelo token de anel ciano; manter estados de erro e desabilitado legíveis.

### Navigation
- **Portal:** cabeçalho navy aderente ao topo, marca à esquerda, links claros e estado ativo ciano; em mobile, painel lateral com links de pelo menos 48px de altura.
- **Gestão:** navegação interna em navy e itens condicionados às permissões da conta.

### Chips
- Fundo de acento suave, texto escuro e formato pílula para estados compactos, como andamento ou seleção de instrumento.

### Study Score Surface
- Partitura em página branca, tinta navy e canvas cinza claro em ambos os temas; preservar rolagem da partitura e controles acessíveis sem encobrir a leitura.

## Do's and Don'ts

### Do:
- **Do** usar os tokens de cor, tipografia e raio centralizados em `src/core/theme/tokens.css`.
- **Do** manter navy para estrutura e texto principal e reservar o ciano para ação, foco e seleção.
- **Do** manter a apresentação da partitura em fundo de papel nos temas claro e escuro.
- **Do** preservar alvos de toque de ao menos 44px e a reorganização para telas estreitas.
- **Do** manter contornos e estados de foco visíveis em controles interativos.

### Don't:
- **Don't** espalhar novos valores hex de interface quando já existe token semântico para o papel.
- **Don't** tratar a gestão como exclusivamente desktop; o produto inclui estudo móvel e acessos em telas estreitas.
- **Don't** aplicar o tema escuro ao papel da partitura; o token de canvas mantém a leitura clara.
