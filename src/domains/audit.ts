export function withAudit(
  values: Record<string, unknown>,
  current?: Record<string, unknown>,
  now = new Date().toISOString(),
): Record<string, unknown> {
  return { ...values, createdAt: current?.createdAt ?? now, updatedAt: now };
}
