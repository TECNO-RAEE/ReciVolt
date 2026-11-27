type UserAccount = { userId: string };

/**
 * Keep the last resolved account while the same user's access token refreshes.
 * A different user or a signed-out session must not reuse that account.
 */
export function accountForUser<T extends UserAccount>(
  account: T | null,
  userId: string | undefined
): T | null {
  return userId && account?.userId === userId ? account : null;
}
