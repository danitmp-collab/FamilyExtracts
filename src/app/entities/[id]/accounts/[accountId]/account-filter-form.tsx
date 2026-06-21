"use client";

import { useRef, useState } from "react";
import type { ConceptGroupFilterOptions, ConceptGroupFilters } from "@/lib/concept-groups";
import type { ViewMode } from "@/lib/view-mode";

type AccountFilterFormProps = {
  action: string;
  filters: ConceptGroupFilters;
  filterOptions: ConceptGroupFilterOptions;
  viewMode: ViewMode;
};

type SelectOption = {
  value: string;
  label: string;
};

export function AccountFilterForm({ action, filters, filterOptions, viewMode }: AccountFilterFormProps) {
  const availableYears = filters.year && !filterOptions.years.includes(filters.year)
    ? [filters.year, ...filterOptions.years]
    : filterOptions.years;
  const yearOptions = [{ value: "", label: "Todos" }, ...availableYears.map((year) => ({ value: year, label: year }))];
  const monthOptions = [{ value: "", label: "Todos" }, ...filterOptions.months];
  const [year, setYear] = useState(filters.year ?? "");
  const [month, setMonth] = useState(filters.month ?? "");

  return (
    <form className="concept-filter-form finance-account-filter" action={action}>
      {viewMode === "personal" ? <input type="hidden" name="mode" value="personal" /> : null}

      <div className="concept-filter-row compact-concept-filter-row">
        <CustomSelect label={"A\u00f1o"} name="year" options={yearOptions} value={year} onChange={setYear} />
        <CustomSelect label="Mes" name="month" options={monthOptions} value={month} onChange={setMonth} />

        <button className="button compact-apply-button" type="submit">
          Aplicar
        </button>

        <details className="date-filter-details compact-date-details">
          <summary aria-label="Configurar fechas">
            <span className="calendar-icon" aria-hidden="true" />
            <span className="sr-only">Configurar fechas</span>
          </summary>
          <div className="date-range-row">
            <label className="field">
              <span>Desde</span>
              <input className="input" type="date" name="dateFrom" defaultValue={filters.dateFrom ?? ""} />
            </label>
            <label className="field">
              <span>Hasta</span>
              <input className="input" type="date" name="dateTo" defaultValue={filters.dateTo ?? ""} />
            </label>
            <button className="button secondary" type="submit">
              Filtrar fechas
            </button>
          </div>
        </details>
      </div>
    </form>
  );
}

function CustomSelect({
  label,
  name,
  options,
  value,
  onChange
}: {
  label: string;
  name: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <label className="field compact-field custom-select-field">
      <span>{label}</span>
      <input type="hidden" name={name} value={value} />
      <details className="custom-select" ref={detailsRef}>
        <summary className="custom-select-trigger">
          <span>{selectedOption.label}</span>
          <span className="custom-select-chevron" aria-hidden="true" />
        </summary>
        <div className="custom-select-menu">
          {options.map((option) => (
            <button
              className={option.value === value ? "custom-select-option active" : "custom-select-option"}
              key={option.value || "all"}
              type="button"
              onClick={() => {
                onChange(option.value);
                if (detailsRef.current) {
                  detailsRef.current.open = false;
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </details>
    </label>
  );
}
