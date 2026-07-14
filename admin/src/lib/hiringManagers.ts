export type HiringManagerCsvRecord = {
  name: string;
  email: string;
  position: string;
  profileLink: string;
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === "\"") {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === "\"") {
        current += "\"";
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseHiringManagersCsv(content: string): HiringManagerCsvRecord[] {
  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    return [];
  }

  const headers = parseCsvLine(rows[0]).map(normalizeHeader);
  const nameIndex = headers.findIndex((header) => header === "name");
  const emailIndex = headers.findIndex((header) => header === "email");
  const positionIndex = headers.findIndex((header) => header === "position");
  const profileLinkIndex = headers.findIndex((header) => header === "profilelink" || header === "link" || header === "profileurl");

  if (nameIndex === -1) {
    throw new Error("CSV must include a Name column.");
  }

  return rows.slice(1).map((row, rowIndex) => {
    const cells = parseCsvLine(row);
    const name = (cells[nameIndex] || "").trim();

    if (!name) {
      throw new Error(`Row ${rowIndex + 2} is missing Name.`);
    }

    return {
      name,
      email: emailIndex >= 0 ? (cells[emailIndex] || "").trim() : "",
      position: positionIndex >= 0 ? (cells[positionIndex] || "").trim() : "",
      profileLink: profileLinkIndex >= 0 ? (cells[profileLinkIndex] || "").trim() : "",
    };
  });
}
