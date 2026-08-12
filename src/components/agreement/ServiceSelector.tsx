"use client";

import { SERVICE_OPTIONS } from "@/config/services";
import { FormField, TextArea, TextInput } from "@/components/agreement/FormField";

export function ServiceSelector({
  selected,
  onToggle,
  locked,
  otherService,
  onOtherService,
  serviceDescription,
  onServiceDescription,
  serviceStartDate,
  onServiceStartDate,
  serviceEndDate,
  onServiceEndDate,
  errors,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  locked?: boolean;
  otherService: string;
  onOtherService: (value: string) => void;
  serviceDescription: string;
  onServiceDescription: (value: string) => void;
  serviceStartDate: string;
  onServiceStartDate: (value: string) => void;
  serviceEndDate: string;
  onServiceEndDate: (value: string) => void;
  errors?: {
    selectedServices?: string;
    otherService?: string;
  };
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-[#475569]">
        Please select all services included under this Agreement:
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SERVICE_OPTIONS.map((service) => {
          const checked = selected.includes(service.id);
          return (
            <label
              key={service.id}
              className="flex items-center gap-3 rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm text-[#111827]"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#1d4ed8]"
                checked={checked}
                disabled={locked}
                onChange={() => onToggle(service.id)}
              />
              {service.label}
            </label>
          );
        })}
      </div>
      {errors?.selectedServices ? (
        <p className="text-xs text-red-600">{errors.selectedServices}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Other Service" error={errors?.otherService}>
          <TextInput
            value={otherService}
            disabled={locked}
            onChange={(event) => onOtherService(event.target.value)}
          />
        </FormField>
        <FormField label="Service Start Date">
          <TextInput
            type="date"
            value={serviceStartDate}
            disabled={locked}
            onChange={(event) => onServiceStartDate(event.target.value)}
          />
        </FormField>
      </div>
      <FormField label="Service Description / Notes">
        <TextArea
          value={serviceDescription}
          disabled={locked}
          onChange={(event) => onServiceDescription(event.target.value)}
        />
      </FormField>
      <FormField label="Service End Date">
        <TextInput
          value={serviceEndDate}
          disabled={locked}
          placeholder="Ongoing — no fixed end date"
          onChange={(event) => onServiceEndDate(event.target.value)}
        />
        <p className="mt-1 text-xs text-[#475569]">
          Date or text is allowed, for example: Ongoing — no fixed end date
        </p>
      </FormField>
    </div>
  );
}
