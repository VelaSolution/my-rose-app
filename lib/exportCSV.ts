export function escapeCSVCell(cell: string | number): string {
  let str = String(cell);
  // Prevent CSV formula injection
  if (/^[=+\-@]/.test(str)) str = "'" + str;
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"` : str;
}

export function buildCSV(headers: string[], rows: (string | number)[][]): string {
  const BOM = "\uFEFF"; // UTF-8 BOM for Korean Excel compatibility
  return BOM + [
    headers.join(","),
    ...rows.map(row => row.map(escapeCSVCell).join(","))
  ].join("\n");
}

export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = buildCSV(headers, rows);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
