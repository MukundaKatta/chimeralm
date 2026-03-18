"use client";

import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && <label className="text-xs text-white/50">{label}</label>}
        <select
          ref={ref}
          className={cn(
            "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white",
            "focus:outline-none focus:border-chimera-500/50 focus:ring-1 focus:ring-chimera-500/30",
            "appearance-none cursor-pointer",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-900">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
