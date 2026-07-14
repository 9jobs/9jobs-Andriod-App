export const previewAdminCredentials = {
  email: "9jobsapplicationservice@gmail.com",
  password: "Akash@#1234",
} as const;

export function validatePreviewAdminLogin(email: string, password: string) {
  return (
    email.trim().toLowerCase() === previewAdminCredentials.email.toLowerCase() &&
    password === previewAdminCredentials.password
  );
}
