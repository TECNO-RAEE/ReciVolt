export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  // ISO date when the person accepted the Términos de uso in the register form, or null if unpublished.
  termsAcceptedAt: string | null;
  // Published terms document at that moment, if any.
  termsUrl: string | null;
}
