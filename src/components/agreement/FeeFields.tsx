import { FormField, TextInput } from "@/components/agreement/FormField";

export function FeeFields({
  setupFee,
  monthlyFee,
  setupFeeLabel,
  monthlyFeeLabel,
  paymentSchedule,
  paymentMethod,
  locked,
  onChange,
}: {
  setupFee: string;
  monthlyFee: string;
  setupFeeLabel: string;
  monthlyFeeLabel: string;
  paymentSchedule: string;
  paymentMethod: string;
  locked?: boolean;
  onChange: (
    field:
      | "setupFee"
      | "monthlyFee"
      | "setupFeeLabel"
      | "monthlyFeeLabel"
      | "paymentSchedule"
      | "paymentMethod",
    value: string,
  ) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="Setup Fee Item Name">
        <TextInput
          value={setupFeeLabel}
          placeholder="Setup Fee"
          disabled={locked}
          onChange={(event) => onChange("setupFeeLabel", event.target.value)}
        />
      </FormField>
      <FormField label="Monthly Fee Item Name">
        <TextInput
          value={monthlyFeeLabel}
          placeholder="Monthly Fee (First Payment)"
          disabled={locked}
          onChange={(event) => onChange("monthlyFeeLabel", event.target.value)}
        />
      </FormField>
      <FormField label="Total Cost / Setup Fee">
        <TextInput
          value={setupFee}
          disabled={locked}
          onChange={(event) => onChange("setupFee", event.target.value)}
        />
      </FormField>
      <FormField label="Monthly Fee (if applicable)">
        <TextInput
          value={monthlyFee}
          disabled={locked}
          onChange={(event) => onChange("monthlyFee", event.target.value)}
        />
      </FormField>
      <FormField label="Payment Schedule">
        <TextInput
          value={paymentSchedule}
          disabled={locked}
          onChange={(event) => onChange("paymentSchedule", event.target.value)}
        />
      </FormField>
      <FormField label="Payment Method">
        <TextInput
          value={paymentMethod}
          disabled={locked}
          onChange={(event) => onChange("paymentMethod", event.target.value)}
        />
      </FormField>
    </div>
  );
}
