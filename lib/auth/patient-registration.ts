export type PatientSignupInput = {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
};

// 에러 코드 반환(messages의 Errors 네임스페이스로 클라이언트에서 번역).
export function validatePatientSignup(input: PatientSignupInput): string[] {
  const errors: string[] = [];
  const email = input.email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("INVALID_EMAIL");
  if (input.password.length < 8) errors.push("PASSWORD_MIN");
  if (input.password !== input.passwordConfirm) errors.push("PASSWORD_MISMATCH");
  if (!input.name.trim()) errors.push("REQUIRED_NAME");
  return errors;
}
