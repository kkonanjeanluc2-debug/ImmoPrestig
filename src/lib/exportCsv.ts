export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns: { key: keyof T; label: string; format?: (value: any, row: T) => string }[]
) {
  if (data.length === 0) {
    return;
  }

  // Create header row
  const headerRow = columns.map(col => `"${col.label}"`).join(';');

  // Create data rows
  const dataRows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      const formatted = col.format ? col.format(value, row) : value;
      // Escape quotes and wrap in quotes
      const escaped = String(formatted ?? '').replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(';');
  });

  // Combine header and data
  const csvContent = [headerRow, ...dataRows].join('\n');

  // Add BOM for Excel compatibility with UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
