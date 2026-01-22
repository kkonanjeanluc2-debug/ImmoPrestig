import * as XLSX from 'xlsx';

export type ExportColumn<T> = {
  key: keyof T;
  label: string;
  format?: (value: any, row: T) => string;
};

function prepareData<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[]
): string[][] {
  const headerRow = columns.map(col => col.label);
  
  const dataRows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      const formatted = col.format ? col.format(value, row) : value;
      return String(formatted ?? '');
    });
  });

  return [headerRow, ...dataRows];
}

export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns: ExportColumn<T>[]
) {
  if (data.length === 0) return;

  const rows = prepareData(data, columns);
  const csvContent = rows.map(row => 
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';')
  ).join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  downloadBlob(blob, `${filename}.csv`);
}

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns: ExportColumn<T>[]
) {
  if (data.length === 0) return;

  const rows = prepareData(data, columns);
  
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  
  // Auto-size columns
  const colWidths = columns.map((col, i) => {
    const maxLength = Math.max(
      col.label.length,
      ...rows.slice(1).map(row => String(row[i]).length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  downloadBlob(blob, `${filename}.xlsx`);
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
