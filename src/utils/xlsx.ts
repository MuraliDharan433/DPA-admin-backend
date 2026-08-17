import ExcelJS from 'exceljs';

export async function toXlsx<T extends Record<string, unknown>>(
  sheetName: string,
  rows: T[],
  columns: { key: keyof T; header: string; width?: number }[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((c) => ({ header: c.header, key: String(c.key), width: c.width ?? 20 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F1FE' } };

  for (const row of rows) sheet.addRow(row);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
