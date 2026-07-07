import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseExcelPreview } from "../src/lib/excel-preview.ts";

const cases = [
  {
    name: "formato-estandar",
    headers: ["F. Operativa", "F. Valor", "Concepto", "Importe", "Saldo", "Referencia 1"],
    row: [46174, 46175, "Bizum prueba", -12.34, 1000, "ABC"],
    verify(result) {
      assert.equal(result.summary.rows_new, 1);
      assert.equal(result.rows[0].fecha_operativa, "2026-06-01");
      assert.equal(result.rows[0].importe, -12.34);
      assert.equal(result.rows[0].grupo_concepto, "Bizum");
    }
  },
  {
    name: "formato-alternativo",
    headers: ["Fecha operacion", "Descripcion", "Amount", "Referencias"],
    row: [45809, "Transferencia 12345", "1.234,56 EUR", "REF  9"],
    verify(result) {
      assert.equal(result.summary.rows_new, 1);
      assert.equal(result.rows[0].importe, 1234.56);
      assert.equal(result.rows[0].grupo_concepto, "Transferencia");
      assert.equal(result.rows[0].referencia, "REF 9");
    }
  },
  {
    name: "fila-invalida",
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

for (const extension of ["xlsx", "xls"]) {
  for (const testCase of cases) {
    const fileName = `${testCase.name}.${extension}`;
    const bytes = writeWorkbook([["Extracto bancario"], testCase.headers, testCase.row], extension);
    const file = new File([bytes], fileName, {
      type:
        extension === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/vnd.ms-excel"
    });
    const result = await parseExcelPreview(file);

    testCase.verify(result);
    console.log(`OK ${fileName}`);
  }
}

function writeWorkbook(rows, extension) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Movimientos");

  return XLSX.write(workbook, {
    type: "array",
    bookType: extension
  });
}
