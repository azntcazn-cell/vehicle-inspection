"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { decodeVin, type VehicleFormState } from "./actions";
import { VinScanner } from "./vin-scanner";

type Vehicle = {
  id: number;
  make: string | null;
  model: string | null;
  year: number | null;
  buyerName: string | null;
  vin: string;
};

export function VehicleForm({
  action,
  vehicle,
  submitLabel,
}: {
  action: (state: VehicleFormState, formData: FormData) => Promise<VehicleFormState>;
  vehicle?: Vehicle;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const vinInputRef = useRef<HTMLInputElement>(null);
  const makeInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);
  const [decoding, startDecoding] = useTransition();
  const [decodeStatus, setDecodeStatus] = useState<string | null>(null);

  function runDecode(vin: string) {
    setDecodeStatus(null);
    startDecoding(async () => {
      const result = await decodeVin(vin);
      if ("error" in result) {
        setDecodeStatus(result.error);
        return;
      }
      if (result.make && makeInputRef.current) makeInputRef.current.value = result.make;
      if (result.model && modelInputRef.current) modelInputRef.current.value = result.model;
      if (result.year && yearInputRef.current) yearInputRef.current.value = String(result.year);
      const found = [result.year, result.make, result.model].filter(Boolean).join(" ");
      setDecodeStatus(found ? `Decoded: ${found}` : "No details found for this VIN.");
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="vin" className="text-sm font-medium text-neutral-700">
            VIN
          </label>
          <div className="flex items-center gap-3">
            <VinScanner
              onScan={(vin) => {
                if (vinInputRef.current) vinInputRef.current.value = vin;
                runDecode(vin);
              }}
            />
            <button
              type="button"
              disabled={decoding}
              onClick={() => runDecode(vinInputRef.current?.value ?? "")}
              className="text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
            >
              {decoding ? "Decoding…" : "🔎 Decode"}
            </button>
          </div>
        </div>
        <input
          ref={vinInputRef}
          id="vin"
          name="vin"
          type="text"
          required
          maxLength={17}
          defaultValue={vehicle?.vin ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-base uppercase focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        {decodeStatus && (
          <p
            className={`text-xs ${
              decodeStatus.startsWith("Decoded:") ? "text-green-700" : "text-red-600"
            }`}
          >
            {decodeStatus}
          </p>
        )}
      </div>

      <Field
        label="Make"
        name="make"
        defaultValue={vehicle?.make ?? ""}
        inputRef={makeInputRef}
      />
      <Field
        label="Model"
        name="model"
        defaultValue={vehicle?.model ?? ""}
        inputRef={modelInputRef}
      />
      <Field
        label="Year"
        name="year"
        type="number"
        defaultValue={vehicle?.year ?? ""}
        inputRef={yearInputRef}
      />
      <Field
        label="Buyer name"
        name="buyerName"
        defaultValue={vehicle?.buyerName ?? ""}
      />

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href="/vehicles" className="text-sm text-neutral-500 hover:text-neutral-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  inputRef,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        ref={inputRef}
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="rounded-md border border-neutral-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-neutral-900"
      />
    </div>
  );
}
