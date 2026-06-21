import ExcelJS from "exceljs";

export type PreviewTransaction = {
  rowNumber: number;
  status: "new" | "duplicate" | "error";
  fecha_operativa: string | null;
  fecha_valor: string | null;
  concepto_original: string;
  concepto_normalizado: string;
  grupo_concepto: string;
  importe: number | null;
  saldo: number | null;
  referencia: string | null;
  deduplication_key: string | null;
  errors: string[];
};

export type ExcelPreviewResult = {
  fileName: string;
  summary: {
    rows_total: number;
    rows_valid: number;
    rows_new: number;
    rows_duplicates: number;
    rows_error: number;
  };
  detectedColumns: Record<string, string | null>;
  rows: PreviewTransaction[];
};

type ExcelJsWorkbookBuffer = Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];

const columnAliases = {
  fecha_operativa: ["f operativa", "fecha operativa", "fecha operacion", "f operacion"],
  fecha_valor: ["f valor", "fecha valor"],
  concepto: ["concepto", "descripcion", "descripcion operacion", "movimiento"],
  importe: ["importe", "amount"],
  saldo: ["saldo"],
  referencia_1: ["referencia 1", "ref 1", "referencia1"],
  referencia_2: ["referencia 2", "ref 2", "referencia2"],
  referencia: ["referencia", "referencias", "ref"]
} as const;

type ColumnKey = keyof typeof columnAliases;
type ColumnMap = Partial<Record<ColumnKey, number>>;

type HeaderDetection = {
  headerRowNumber: number;
  columns: ColumnMap;
  labels: Partial<Record<ColumnKey, string>>;
};

export async function parseExcelPreview(file: File): Promise<ExcelPreviewResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJsWorkbookBuffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("El archivo no contiene hojas.");
  }

  const header = detectHeader(worksheet);

  if (!header.columns.fecha_operativa || !header.columns.concepto || !header.columns.importe) {
    throw new Error("No se detectaron las columnas minimas: fecha operativa, concepto e importe.");
  }

  const rows: PreviewTransaction[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= header.headerRowNumber) {
      return;
    }

    if (isEmptyDataRow(row, header.columns)) {
      return;
    }

    const parsed = parsePreviewRow(row, rowNumber, header.columns);
    rows.push(parsed);
  });

  const rowsValid = rows.filter((row) => row.errors.length === 0).length;

  return {
    fileName: file.name,
    summary: {
      rows_total: rows.length,
      rows_valid: rowsValid,
      rows_new: rowsValid,
      rows_duplicates: 0,
      rows_error: rows.length - rowsValid
    },
    detectedColumns: {
      fecha_operativa: header.labels.fecha_operativa ?? null,
      fecha_valor: header.labels.fecha_valor ?? null,
      concepto: header.labels.concepto ?? null,
      importe: header.labels.importe ?? null,
      saldo: header.labels.saldo ?? null,
      referencia_1: header.labels.referencia_1 ?? null,
      referencia_2: header.labels.referencia_2 ?? null,
      referencia: header.labels.referencia ?? null
    },
    rows
  };
}

function detectHeader(worksheet: ExcelJS.Worksheet): HeaderDetection {
  const maxHeaderScanRows = Math.min(worksheet.rowCount, 20);
  let best: HeaderDetection = {
    headerRowNumber: 1,
    columns: {},
    labels: {}
  };
  let bestScore = 0;

  for (let rowNumber = 1; rowNumber <= maxHeaderScanRows; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const candidate: HeaderDetection = {
      headerRowNumber: rowNumber,
      columns: {},
      labels: {}
    };

    row.eachCell((cell, colNumber) => {
      const label = getCellText(cell.value);
      const normalized = normalizeHeader(label);
      const match = matchHeader(normalized);

      if (match && !candidate.columns[match]) {
        candidate.columns[match] = colNumber;
        candidate.labels[match] = label;
      }
    });

    const score = scoreHeader(candidate.columns);

    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

function scoreHeader(columns: ColumnMap) {
  let score = 0;

  if (columns.fecha_operativa) score += 3;
  if (columns.concepto) score += 3;
  if (columns.importe) score += 3;
  if (columns.fecha_valor) score += 1;
  if (columns.saldo) score += 1;
  if (columns.referencia || columns.referencia_1 || columns.referencia_2) score += 1;

  return score;
}

function matchHeader(normalized: string): ColumnKey | null {
  for (const [key, aliases] of Object.entries(columnAliases) as Array<[ColumnKey, readonly string[]]>) {
    if (aliases.includes(normalized)) {
      return key;
    }
  }

  return null;
}

function parsePreviewRow(row: ExcelJS.Row, rowNumber: number, columns: ColumnMap): PreviewTransaction {
  const fechaOperativa = parseDateCell(getCellValue(row, columns.fecha_operativa));
  const fechaValor = parseDateCell(getCellValue(row, columns.fecha_valor));
  const conceptoOriginal = normalizeWhitespace(getCellText(getCellValue(row, columns.concepto)));
  const concept = normalizeConcept(conceptoOriginal);
  const importe = parseAmountCell(getCellValue(row, columns.importe));
  const saldo = parseAmountCell(getCellValue(row, columns.saldo));
  const referencia = buildReference(row, columns);
  const errors: string[] = [];

  if (!fechaOperativa) {
    errors.push("Fecha operativa no valida.");
  }

  if (!conceptoOriginal) {
    errors.push("Concepto vacio.");
  }

  if (importe === null) {
    errors.push("Importe no valido.");
  }

  return {
    rowNumber,
    status: errors.length > 0 ? "error" : "new",
    fecha_operativa: fechaOperativa,
    fecha_valor: fechaValor,
    concepto_original: conceptoOriginal,
    concepto_normalizado: concept.normalized,
    grupo_concepto: concept.group,
    importe,
    saldo,
    referencia,
    deduplication_key: null,
    errors
  };
}

function buildReference(row: ExcelJS.Row, columns: ColumnMap) {
  const parts = [columns.referencia, columns.referencia_1, columns.referencia_2]
    .map((column) => normalizeWhitespace(getCellText(getCellValue(row, column))))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : null;
}

function isEmptyDataRow(row: ExcelJS.Row, columns: ColumnMap) {
  const relevantColumns = [
    columns.fecha_operativa,
    columns.fecha_valor,
    columns.concepto,
    columns.importe,
    columns.saldo,
    columns.referencia,
    columns.referencia_1,
    columns.referencia_2
  ];

  return relevantColumns.every((column) => !normalizeWhitespace(getCellText(getCellValue(row, column))));
}

function getCellValue(row: ExcelJS.Row, column?: number) {
  if (!column) {
    return null;
  }

  return row.getCell(column).value;
}

function getCellText(value: ExcelJS.CellValue | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if ("text" in value && value.text) {
      return String(value.text);
    }

    if ("result" in value) {
      return getCellText(value.result);
    }

    if ("richText" in value) {
      return value.richText.map((part) => part.text).join("");
    }
  }

  return String(value);
}

function normalizeHeader(value: string) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function parseDateCell(value: ExcelJS.CellValue | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDate(value);
  }

  if (typeof value === "number") {
    return excelSerialDateToIso(value);
  }

  const text = normalizeWhitespace(getCellText(value));

  if (!text) {
    return null;
  }

  const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = normalizeYear(Number(slashMatch[3]));
    const date = new Date(Date.UTC(year, month - 1, day));

    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return toIsoDate(date);
    }
  }

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return toIsoDate(parsed);
  }

  return null;
}

function excelSerialDateToIso(serial: number) {
  if (serial <= 0) {
    return null;
  }

  const excelEpoch = Date.UTC(1899, 11, 30);
  const date = new Date(excelEpoch + serial * 24 * 60 * 60 * 1000);
  return toIsoDate(date);
}

function normalizeYear(year: number) {
  if (year < 100) {
    return year >= 70 ? 1900 + year : 2000 + year;
  }

  return year;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseAmountCell(value: ExcelJS.CellValue | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return roundMoney(value);
  }

  const text = normalizeWhitespace(getCellText(value))
    .replace(/\s/g, "")
    .replace(/€/g, "");

  if (!text) {
    return null;
  }

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  let normalized = text;

  if (lastComma > -1 && lastDot > -1) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized.split(thousandsSeparator).join("");
    normalized = normalized.replace(decimalSeparator, ".");
  } else if (lastComma > -1) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }

  normalized = normalized.replace(/[^0-9.-]/g, "");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? roundMoney(amount) : null;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeConcept(value: string) {
  const normalized = stripAccents(value).toUpperCase().replace(/\s+/g, " ").trim() || "SIN CONCEPTO";

  if (/\bTRANSFERENCIA\b/.test(normalized)) {
    return {
      normalized: normalized.replace(/\b\d+\b/g, "").replace(/\s+/g, " ").trim() || "TRANSFERENCIA",
      group: "Transferencia"
    };
  }

  if (/\bBIZUM\b/.test(normalized)) {
    return {
      normalized,
      group: "Bizum"
    };
  }

  if (/\bSEGUROS?\b/.test(normalized)) {
    return {
      normalized,
      group: "Seguros"
    };
  }

  return {
    normalized,
    group: titleCase(normalized.split(/\s+/).slice(0, 3).join(" "))
  };
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  const lower = value.toLowerCase();
  return lower.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
