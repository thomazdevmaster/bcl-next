/** Falha de operação em produção — tom público, sem jargão de API. */
export const UNDER_CONSTRUCTION_MESSAGE =
  'Seja paciente, site ainda em construção, aguarde o desenvolvimento da funcionalidade.';

function isProductionUi(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Mensagem de falha de operação.
 * Em produção: aviso de site em construção.
 * Em desenvolvimento: detalhe da exceção ou o fallback em português.
 */
export function failureMessage(
  caught?: unknown,
  developmentFallback = 'Não foi possível concluir a operação.',
): string {
  if (isProductionUi()) return UNDER_CONSTRUCTION_MESSAGE;
  if (caught instanceof Error && caught.message.trim()) return caught.message.trim();
  return developmentFallback;
}

/**
 * Converte exceção em texto para a tela.
 * Validação e credenciais inválidas continuam específicas nos dois ambientes.
 */
export function userFacingError(caught?: unknown, developmentFallback?: string): string {
  if (caught instanceof Error && caught.message.trim()) {
    return caught.message.trim();
  }
  return failureMessage(caught, developmentFallback);
}
