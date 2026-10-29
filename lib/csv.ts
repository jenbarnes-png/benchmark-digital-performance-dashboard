// Turns rows into CSV text that opens cleanly in Excel and Google Sheets.
//  - Every value is quoted, and quotes inside values are doubled.
//  - Text starting with = + - @ gets a leading apostrophe so a spreadsheet can't run it as a formula.
//  - A byte-order mark at the start makes Excel read accents and £ signs correctly.
export type CsvValue = string | number | boolean | null | undefined;

const BOM = "﻿";

function cell(value: CsvValue): string {
  if (value === null || value === undefined) return '""';
  let text = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(","));
  return BOM + lines.join("\r\n") + "\r\n";
}
