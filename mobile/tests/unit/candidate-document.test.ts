import { normalizeDocumentMimeType } from "@/lib/data/candidate-questionnaire";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { multiGet: jest.fn(), multiSet: jest.fn() },
}));

describe("candidate document MIME normalization", () => {
  test.each([
    ["resume.pdf", "text/plain", "application/pdf"],
    ["resume.PDF", null, "application/pdf"],
    ["profile.jpg", "text/plain", "image/jpeg"],
    ["profile.jpeg", "application/octet-stream", "image/jpeg"],
    ["visa.png", "text/plain", "image/png"],
  ])("trusts the supported extension for %s", (name, reported, expected) => {
    expect(normalizeDocumentMimeType(name, reported)).toBe(expected);
  });
});
