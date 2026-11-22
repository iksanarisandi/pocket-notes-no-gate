export function isPasswordRecoveryLink(hash: string): boolean {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(fragment).get("type") === "recovery";
}

export function passwordResetRedirect(origin: string): string {
  return `${origin}/reset-password`;
}