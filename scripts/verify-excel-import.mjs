import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { parseExcelPreview } from "../src/lib/excel-preview.ts";

const cases = [
  {
    name: "formato-estandar.xlsx",
    headers: ["F. Operativa", "F. Valor", "Concepto", "Importe", "Saldo", "Referencia 1"],
    row: [new Date("2026-06-01T00:00:00Z"), new Date("2026-06-02T00:00:00Z"), "Bizum prueba", -12.34, 1000, "ABC"],
    verify(result) {
      assert.equal(result.summary.rows_new, 1);
      assert.equal(result.rows[0].fecha_operativa, "2026-06-01");
      assert.equal(result.rows[0].importe, -12.34);
      assert.equal(result.rows[0].grupo_concepto, "Bizum");
    }
  },
  {
    name: "formato-alternativo.xlsx",
    headers: ["Fecha operación", "Descripción", "Amount", "Referencias"],
    row: [45809, "Transferencia 12345", "1.234,56 €", "REF  9"],
    verify(result) {
      assert.equal(result.summary.rows_new, 1);
      assert.equal(result.rows[0].importe, 1234.56);
      assert.equal(result.rows[0].grupo_concepto, "Transferencia");
      assert.equal(result.rows[0].referencia, "REF 9");
    }
  },
  {
    name: "fila-invalida.xlsx",
    headers: ["Fecha operativa", "Movimiento", "Importe"],
    row: ["fecha mala", "Compra", "no-numero"],
    verify(result) {
      assert.equal(result.summary.rows_new, 0);
      assert.equal(result.summary.rows_error, 1);
      assert.equal(result.rows[0].status, "error");
      assert.equal(result.rows[0].errors.length, 2);
    }
  }
];

for (const testCase of cases) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Movimientos");
  sheet.addRow(["Extracto bancario"]);
  sheet.addRow(testCase.headers);
  sheet.addRow(testCase.row);

  const bytes = await workbook.xlsx.writeBuffer();
  const file = new File([bytes], testCase.name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const result = await parseExcelPreview(file);

  testCase.verify(result);
  console.log(`OK ${testCase.name}`);
}
