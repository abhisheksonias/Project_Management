import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ExpenseDynamicFieldProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const ExpenseDynamicField: React.FC<ExpenseDynamicFieldProps> = ({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  required,
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        required={required}
        autoComplete="off"
        className="w-full"
      />
      {options.length > 0 && (
        <Select onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="h-9 w-full text-sm">
            <SelectValue placeholder={`Pick saved ${label.toLowerCase()} (optional)`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
