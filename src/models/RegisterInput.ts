export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  // ISO date when the person accepted the Términos de uso in the register form.
  termsAcceptedAt: string;
  // Published terms document at that moment, if any.
  termsUrl: string | null;
}
