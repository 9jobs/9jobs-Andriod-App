import { describe, expect, test } from "vitest";
import { parseHiringManagersCsv } from "./hiringManagers";

describe("parseHiringManagersCsv", () => {
  test("parses required and optional hiring manager fields", () => {
    const records = parseHiringManagersCsv(
      [
        "Name,Email,Position,Profile Link",
        "Sarah Chen,sarah@example.com,Engineering Manager,https://linkedin.com/in/sarah",
        "Marcus Webb,,Recruiter,",
      ].join("\n"),
    );

    expect(records).toEqual([
      {
        name: "Sarah Chen",
        email: "sarah@example.com",
        position: "Engineering Manager",
        profileLink: "https://linkedin.com/in/sarah",
      },
      {
        name: "Marcus Webb",
        email: "",
        position: "Recruiter",
        profileLink: "",
      },
    ]);
  });

  test("throws when the csv is missing a name column", () => {
    expect(() => parseHiringManagersCsv("Email,Position\nhello@example.com,Recruiter")).toThrow("CSV must include a Name column.");
  });
});
