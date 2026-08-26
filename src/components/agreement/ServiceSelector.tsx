"use client";

import { SERVICE_OPTIONS } from "@/config/services";
import { FormField, TextArea, TextInput } from "@/components/agreement/FormField";

function toDateInputValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
}

export function ServiceSelector({
  selected,
  onToggle,
  locked,
  serviceDescription,
  onServiceDescription,
  serviceDescriptionLocked,
  serviceStartDate,
  onServiceStartDate,
  serviceEndDate,
  onServiceEndDate,
  errors,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  locked?: boolean;
  serviceDescription: string;
  onServiceDescription: (value: string) => void;
  serviceDescriptionLocked?: boolean;
  serviceStartDate: string;
  onServiceStartDate: (value: string) => void;
  serviceEndDate: string;
  onServiceEndDate: (value: string) => void;
  errors?: {
    selectedServices?: string;
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
        <FormField label="Service Description / Notes">
          <TextArea
            value={serviceDescription}
            disabled={serviceDescriptionLocked}
            onChange={(event) => onServiceDescription(event.target.value)}
          />
        </FormField>
        <FormField label="Service Start Date">
          <TextInput
            type="date"
            value={toDateInputValue(serviceStartDate)}
            disabled
            onChange={(event) => onServiceStartDate(event.target.value)}
          />
        </FormField>
        <FormField label="Service End Date">
          {serviceEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(serviceEndDate) ? (
            <TextInput
              value={serviceEndDate}
              disabled
              readOnly
            />
          ) : (
            <TextInput
              type="date"
              value={toDateInputValue(serviceEndDate)}
              disabled
              onChange={(event) => onServiceEndDate(event.target.value)}
            />
          )}
        </FormField>
      </div>
    </div>
  );
}
