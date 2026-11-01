export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  // ISO date when the person accepted the Términos de uso in the register form.
  termsAcceptedAt: string;
}
