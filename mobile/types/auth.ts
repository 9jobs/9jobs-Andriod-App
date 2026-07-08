export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
};

export type SignInPayload = {
  email: string;
  password: string;
};

export type SignUpPayload = SignInPayload & {
  fullName: string;
};
