import { fireEvent, render } from "@testing-library/react-native";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";

const mockSignIn = {
  status: "needs_first_factor",
  create: jest.fn(),
  resetPasswordEmailCode: { sendCode: jest.fn(), verifyCode: jest.fn(), submitPassword: jest.fn() },
};
jest.mock("@clerk/expo", () => ({ useSignIn: () => ({ signIn: mockSignIn }) }));
jest.mock("@/components/ui/TextField", () => ({ TextField: (props: any) => {
  const { TextInput } = require("react-native");
  return <TextInput accessibilityLabel={props.label} {...props} />;
} }));
jest.mock("@/components/ui/PrimaryButton", () => ({ PrimaryButton: ({ label, onPress, disabled }: any) => {
  const { Pressable, Text } = require("react-native");
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}><Text>{label}</Text></Pressable>;
} }));
beforeEach(() => {
  jest.clearAllMocks();
  mockSignIn.status = "needs_first_factor";
  mockSignIn.create.mockResolvedValue({});
  mockSignIn.resetPasswordEmailCode.sendCode.mockResolvedValue({});
  mockSignIn.resetPasswordEmailCode.verifyCode.mockImplementation(async () => { mockSignIn.status = "needs_new_password"; return {}; });
  mockSignIn.resetPasswordEmailCode.submitPassword.mockResolvedValue({});
});

it("validates email without contacting Clerk and preserves the back action", async () => {
  const onBack = jest.fn();
  const view = await render(<ForgotPasswordForm initialEmail="invalid" onBack={onBack} />);
  await fireEvent.press(view.getByLabelText("Send reset code"));
  expect(view.getByText("Enter a valid email address")).toBeTruthy();
  expect(mockSignIn.create).not.toHaveBeenCalled();
  await fireEvent.press(view.getByLabelText("Back to sign in"));
  expect(onBack).toHaveBeenCalledTimes(1);
});
it("does not show a sent-code form when Clerk rejects the email", async () => {
  mockSignIn.create.mockResolvedValue({ error: { message: "Unable to send a reset code" } });
  const view = await render(<ForgotPasswordForm initialEmail="test@example.invalid" onBack={jest.fn()} />);
  await fireEvent.press(view.getByLabelText("Send reset code"));
  expect(view.getByText("Unable to send a reset code")).toBeTruthy();
  expect(mockSignIn.resetPasswordEmailCode.sendCode).not.toHaveBeenCalled();
  expect(view.queryByLabelText("Reset code")).toBeNull();
});
it("rejects an incorrect email code without exposing password fields", async () => {
  mockSignIn.resetPasswordEmailCode.verifyCode.mockResolvedValue({ error: { message: "Incorrect code" } });
  const view = await render(<ForgotPasswordForm initialEmail="test@example.invalid" onBack={jest.fn()} />);
  await fireEvent.press(view.getByLabelText("Send reset code"));
  await fireEvent.changeText(view.getByLabelText("Reset code"), "000000");
  await fireEvent.press(view.getByLabelText("Verify code"));
  expect(view.getByText("Incorrect code")).toBeTruthy();
  expect(view.queryByLabelText("New password")).toBeNull();
  expect(mockSignIn.resetPasswordEmailCode.submitPassword).not.toHaveBeenCalled();
});
it("requires verified code and matching masked passwords before submitting to Clerk", async () => {
  const view = await render(<ForgotPasswordForm initialEmail=" TEST@example.invalid " onBack={jest.fn()} />);
  await fireEvent.press(view.getByLabelText("Send reset code"));
  expect(mockSignIn.create).toHaveBeenCalledWith({ identifier: "test@example.invalid" });
  await fireEvent.changeText(view.getByLabelText("Reset code"), "123456");
  await fireEvent.press(view.getByLabelText("Verify code"));
  expect(view.getByLabelText("New password").props.secureTextEntry).toBe(true);
  await fireEvent.changeText(view.getByLabelText("New password"), "test-password-only");
  await fireEvent.changeText(view.getByLabelText("Confirm new password"), "different-test-password");
  await fireEvent.press(view.getByLabelText("Reset password"));
  expect(mockSignIn.resetPasswordEmailCode.submitPassword).not.toHaveBeenCalled();
  expect(view.getByText("Passwords do not match")).toBeTruthy();
  await fireEvent.changeText(view.getByLabelText("Confirm new password"), "test-password-only");
  await fireEvent.press(view.getByLabelText("Reset password"));
  expect(mockSignIn.resetPasswordEmailCode.submitPassword).toHaveBeenCalledWith({ password: "test-password-only" });
  expect(view.getByText(/Password updated successfully/)).toBeTruthy();
  expect(view.queryByLabelText("New password")).toBeNull();
});
