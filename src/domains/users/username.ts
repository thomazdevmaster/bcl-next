export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,59}$/;

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}
