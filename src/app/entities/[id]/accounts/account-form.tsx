import type { BankAccount } from "@/lib/bank-accounts";

type AccountFormProps = {
  account?: BankAccount;
  action: (formData: FormData) => void | Promise<void>;
  showActive?: boolean;
  submitLabel: string;
};

export function AccountForm({
  account,
  action,
  showActive = false,
  submitLabel
}: AccountFormProps) {
  return (
    <form className="form" action={action}>
      <label className="field">
        <span>Nombre</span>
        <input className="input" type="text" name="name" defaultValue={account?.name} required />
      </label>

      <label className="field">
        <span>Banco</span>
        <input className="input" type="text" name="bank_name" defaultValue={account?.bank_name ?? ""} />
      </label>

      <label className="field">
        <span>Ultimos 4 digitos IBAN</span>
        <input
          className="input"
          type="text"
          name="iban_last4"
          defaultValue={account?.iban_last4 ?? ""}
          inputMode="numeric"
          maxLength={4}
          pattern="[0-9]{4}"
        />
      </label>

      <label className="field">
        <span>Moneda</span>
        <input
          className="input"
          type="text"
          name="currency"
          defaultValue={account?.currency ?? "EUR"}
          maxLength={3}
          required
        />
      </label>

      {showActive ? (
        <label className="check-field">
          <input type="checkbox" name="active" defaultChecked={account?.active ?? true} />
          <span>Cuenta activa</span>
        </label>
      ) : null}

      <button className="button" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
