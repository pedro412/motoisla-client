"use client";

import { TextField } from "@mui/material";
import type { TextFieldProps } from "@mui/material";

import { formatNumberWithThousands, normalizeMoneyInput } from "@/modules/products/utils";

interface MoneyInputProps extends Omit<TextFieldProps, "onChange" | "value" | "type"> {
  value: string;
  onChange: (value: string) => void;
}

export function MoneyInput({ value, onChange, inputProps, ...props }: MoneyInputProps) {
  return (
    <TextField
      {...props}
      value={formatNumberWithThousands(value)}
      onChange={(event) => {
        onChange(normalizeMoneyInput(event.target.value));
      }}
      inputMode="decimal"
      inputProps={{
        ...inputProps,
      }}
    />
  );
}
