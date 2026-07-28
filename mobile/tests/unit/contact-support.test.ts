import {
  buildSupportEmailUrl,
  buildSupportMessage,
  buildSupportWhatsAppUrl,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_WHATSAPP,
  submitContactForm,
  validateContactForm,
} from "@/lib/contact-support";

const validForm = {
  name: "Client Name",
  email: "client@example.com",
  subject: "Need help",
  message: "Please contact me.",
};

describe("contact support", () => {
  it("validates all required client details", () => {
    expect(validateContactForm({ ...validForm, name: "" })).toBe("Please enter your name.");
    expect(validateContactForm({ ...validForm, email: "invalid" })).toBe("Please enter a valid email address.");
    expect(validateContactForm(validForm)).toBeNull();
  });

  it("includes the complete client details in the support message", () => {
    const message = buildSupportMessage(validForm);
    expect(message).toContain("Client Name");
    expect(message).toContain("client@example.com");
    expect(message).toContain("Need help");
    expect(message).toContain("Please contact me.");
  });

  it("targets the requested email and WhatsApp number", () => {
    expect(buildSupportEmailUrl(validForm)).toContain(`mailto:${SUPPORT_EMAIL}`);
    expect(buildSupportWhatsAppUrl(validForm)).toContain(`https://wa.me/${SUPPORT_PHONE_WHATSAPP}`);
  });

  it("submits the complete form to the backend email endpoint", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, messageId: "test-message" }),
    } as Response);

    await expect(submitContactForm(validForm)).resolves.toEqual({
      success: true,
      messageId: "test-message",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://10.0.2.2:3000/api/contact",
      expect.objectContaining({ method: "POST", body: JSON.stringify(validForm) }),
    );
    fetchMock.mockRestore();
  });
});
