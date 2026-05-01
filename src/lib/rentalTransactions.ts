export type RentalTransactionType =
  | "deposit" | "balance" | "full_payment" | "refund" | "security_deposit"
  | "security_deposit_refund" | "discount" | "extra_fee" | "cleaning_fee"
  | "cancellation_fee" | "adjustment";

export type RentalTransactionStatus = "pending" | "completed" | "failed" | "refunded" | "voided";

export const TX_TYPE_LABEL: Record<RentalTransactionType, string> = {
  deposit: "Záloha",
  balance: "Doplatek",
  full_payment: "Plná platba",
  refund: "Vrácení peněz",
  security_deposit: "Kauce",
  security_deposit_refund: "Vrácení kauce",
  discount: "Sleva",
  extra_fee: "Příplatek",
  cleaning_fee: "Poplatek za úklid",
  cancellation_fee: "Storno poplatek",
  adjustment: "Úprava",
};

// Types where the entered amount means money OUT (host → guest) -> stored as negative
export const NEGATIVE_TYPES: RentalTransactionType[] = [
  "refund", "security_deposit_refund", "discount",
];

export const TX_STATUS_LABEL: Record<RentalTransactionStatus, string> = {
  pending: "Čeká",
  completed: "Dokončeno",
  failed: "Selhalo",
  refunded: "Vráceno",
  voided: "Zrušeno",
};

export const PAYMENT_METHODS = [
  { value: "cash", label: "Hotovost" },
  { value: "bank_transfer", label: "Bankovní převod" },
  { value: "card", label: "Karta (offline)" },
  { value: "stripe", label: "Stripe" },
  { value: "other", label: "Jiné" },
];

export function formatMoney(amount: number, currency = "USD") {
  return `${amount < 0 ? "-" : ""}${Math.abs(amount).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} ${currency}`;
}
