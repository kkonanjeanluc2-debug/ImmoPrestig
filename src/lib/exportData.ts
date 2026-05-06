import ExcelJS from 'exceljs';

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

export async function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns: ExportColumn<T>[]
) {
  if (data.length === 0) return;

  const rows = prepareData(data, columns);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gestion Immobilière';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Données', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // Header
  const headerRow = worksheet.addRow(rows[0]);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1A365D' } },
      left: { style: 'thin', color: { argb: 'FF1A365D' } },
      bottom: { style: 'medium', color: { argb: 'FF1A365D' } },
      right: { style: 'thin', color: { argb: 'FF1A365D' } },
    };
  });

  const statusColIdx = columns.findIndex((c) =>
    String(c.label).toLowerCase().includes('statut')
  );

  for (let i = 1; i < rows.length; i++) {
    const row = worksheet.addRow(rows[i]);
    const isEven = i % 2 === 0;
    row.height = 20;
    row.eachCell((cell, colNumber) => {
      cell.font = { size: 10, name: 'Calibri', color: { argb: 'FF1F2937' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        right: { style: 'hair', color: { argb: 'FFE5E7EB' } },
      };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
      if (statusColIdx >= 0 && colNumber === statusColIdx + 1) {
        const value = String(cell.value ?? '');
        let bg = 'FFF1F5F9';
        let fg = 'FF334155';
        if (/à jour|a jour|payé|paye/i.test(value)) { bg = 'FFD1FAE5'; fg = 'FF065F46'; }
        else if (/retard|impayé|impaye/i.test(value)) { bg = 'FFFEE2E2'; fg = 'FF991B1B'; }
        else if (/à venir|a venir/i.test(value)) { bg = 'FFDBEAFE'; fg = 'FF1E40AF'; }
        else if (/attente/i.test(value)) { bg = 'FFFEF3C7'; fg = 'FF92400E'; }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { size: 10, name: 'Calibri', bold: true, color: { argb: fg } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  }

  columns.forEach((col, i) => {
    const maxLength = Math.max(
      col.label.length,
      ...rows.slice(1).map((row) => String(row[i] ?? '').length)
    );
    worksheet.getColumn(i + 1).width = Math.min(Math.max(maxLength + 4, 12), 50);
  });

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

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
