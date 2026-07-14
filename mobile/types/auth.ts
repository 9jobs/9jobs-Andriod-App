export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
};

export type SignInPayload = {
  email: string;
  password: string;
};

export type SignUpPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};
