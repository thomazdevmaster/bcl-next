# Unificar agenda e tipos de evento — desenho

## Intenção

Unificar a gestão de eventos e a agenda pública sob o conceito **Agenda**, removendo a separação de produto entre “Apresentações” na gestão e “Agenda” no portal. O escopo desta entrega é exclusivamente o frontend `bcl-next`; a API está sendo tratada em outra janela e fornecerá os dados e operações necessários.

## Abordagens

1. **Reaproveitar o CRUD atual de `presentations` e acrescentar a gestão de tipos dentro de Agenda — escolhida pelo usuário.** Preserva o formulário, os IDs, as permissões, o vínculo com repertório e o contrato atual de eventos, acrescentando a seção de tipos com os componentes compartilhados do projeto.
2. **Criar um workspace novo que substitua o CRUD atual de eventos.** Permitiria reorganizar a gestão de uma vez, mas duplicaria comportamento que o `DomainWorkspace` já oferece e aumentaria o risco de perder fluxos existentes.

## Objetivos

- Apresentar um único módulo de gestão com o rótulo **Agenda**, na rota `/gestao/agenda`.
- Manter `/gestao/apresentacoes` como rota de compatibilidade que redireciona para a rota nova, preservando os parâmetros de busca.
- Continuar usando o domínio `presentations`, o `DomainWorkspace` e o formulário atual de eventos, incluindo repertório.
- Permitir que maestros e admins criem, editem e desativem tipos dentro do módulo Agenda, sem novo item no menu.
- Oferecer os tipos iniciais **Apresentação/concerto**, **Encontro de banda** e **Outros** a partir da API, sem opções de catálogo duplicadas no frontend.
- Exigir a seleção de tipo em eventos novos; preservar tipo inativo/snapshot em eventos antigos.
- Mostrar o tipo como badge nos eventos da agenda pública, sem filtro nesta etapa.
- Ao selecionar o tipo de um evento novo, preencher a visibilidade com `isPublicByDefault`. Se a pessoa alterar a visibilidade manualmente, uma troca posterior de tipo preserva a escolha manual.

## Fora de escopo

- Qualquer implementação no repositório `bcl-api`, migração de banco ou seed.
- Alterar o módulo de Estudo, trocar o recurso `presentations` ou remover o vínculo de repertório.
- Filtro público por tipo, Google Calendar e venda de ingressos.
- API mock, persistência local ou geração de IDs no frontend.

## Decisões de produto

- A rota principal de gestão será `/gestao/agenda`; o caminho antigo continuará funcionando por redirecionamento.
- A administração de tipos ficará numa aba/seção dentro de Agenda, sem item próprio no menu lateral.
- O catálogo inicial vem da API e inclui “Apresentação/concerto”, “Encontro de banda” e “Outros”. O frontend não os mantém como uma segunda fonte de verdade.
- Cada tipo contém nome, ícone opcional, `isPublicByDefault`, estado ativo/inativo e indicação de tipo predefinido.
- Maestros e admins podem criar, editar e desativar tipos personalizados. Tipos predefinidos permanecem ativos e não podem ser excluídos.
- Tipos personalizados não são excluídos pela interface; podem ser desativados para que deixem de ser oferecidos em novos eventos.
- Eventos existentes continuam mostrando o nome e ícone do tipo salvo quando esse tipo é desativado.
- Tipos ativos podem ser escolhidos em eventos novos. Um tipo inativo pode permanecer selecionado ao editar um evento que já o utiliza, mas não deve ser oferecido como opção para outro evento.
- A visibilidade pública padrão é aplicada ao selecionar tipo durante a criação. Uma escolha manual de visibilidade não é sobrescrita por uma troca posterior de tipo.
- A agenda pública continua exibindo somente eventos públicos e mostra o tipo num badge, sem filtro.

## Como será construído no frontend

- Atualizar o catálogo/navegação de gestão para exibir **Agenda** e registrar a página em `/gestao/agenda`, mantendo `resource="presentations"`.
- Converter `/gestao/apresentacoes` em redirecionamento compatível, preservando query params usados por links antigos e notificações.
- Completar o formulário de evento para carregar tipos da API, exigir escolha na criação, preservar a escolha em edição e aplicar o padrão público sem sobrescrever uma alteração manual.
- Implementar uma seção de tipos dentro da Agenda, visível para maestro/admin, usando a API e os padrões de acesso existentes.
- Compor criar/editar tipo com schema Zod no domínio, React Hook Form, `FormProvider`, `FormView`, `FormStageBlock`, campos compartilhados e mensagens acessíveis. Usar seleção compartilhada de ícones Material; não criar uma família paralela de campos.
- Mostrar o nome do tipo nos registros da gestão e nos cards públicos; exibir o ícone opcional com nome acessível.
- Usar exclusivamente classes Tailwind para estilos de componentes novos ou alterados e manter os fluxos utilizáveis em 360 px e desktop.

## Restrições e qualidade

- A API é dona da persistência, dos IDs e da autorização; a UI não substitui controles de permissão do servidor.
- Seguir TypeScript estrito, os componentes compartilhados de formulário e o padrão acessível do projeto.
- Mudanças funcionais no frontend recebem testes de regressão para formulário, catálogo, navegação, permissões visíveis e apresentação pública.
- Verificar lint/tipos dos arquivos alterados e, conforme os comandos do projeto, testes focados e suíte completa.
- Não alterar os arquivos de backend nesta entrega.

## Deixado ao implementador

- Encaixar a aba/seção de tipos nas abstrações de gestão já existentes, evitando duplicação do CRUD de eventos.
- Usar as operações e o formato de resposta que a API disponibilizar para os tipos; reportar incompatibilidade de contrato se impedir a integração do frontend.
- Escolher ícones Material coerentes para os três tipos iniciais quando a API não fornecer ícone e manter ícone opcional para tipos customizados.
