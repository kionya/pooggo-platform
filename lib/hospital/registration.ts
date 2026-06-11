export type HospitalRegistrationInput = {
  email: string;
  password: string;
  passwordConfirm: string;
  hospitalName: string;
};

export function validateHospitalRegistration(input: HospitalRegistrationInput): string[] {
  const errors: string[] = [];
  const email = input.email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email: 올바른 이메일을 입력하세요.");
  if (input.password.length < 8) errors.push("password: 비밀번호는 8자 이상이어야 합니다.");
  if (input.password !== input.passwordConfirm) errors.push("passwordConfirm: 비밀번호가 일치하지 않습니다.");
  if (!input.hospitalName.trim()) errors.push("hospitalName: 병원명은 필수입니다.");
  return errors;
}
