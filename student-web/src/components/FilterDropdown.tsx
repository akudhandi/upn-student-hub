"use client";

export function ChevronDownIcon({ rotated }: { rotated: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 text-[#6E6A66] transition-transform duration-150 ${
        rotated ? "rotate-180" : ""
      }`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M3.5 8.5L6.5 11.5L12.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FilterDropdown({
  id,
  label,
  requiredMarker,
  value,
  displayLabel,
  isOpen,
  disabled,
  placement = "bottom",
  onToggle,
  onSelect,
  options,
  className,
}: {
  id: string;
  label: string;
  requiredMarker?: boolean;
  value: string;
  displayLabel: string;
  isOpen: boolean;
  disabled?: boolean;
  placement?: "bottom" | "top";
  onToggle: () => void;
  onSelect: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-medium text-[#57534E]">
        {label} {requiredMarker && <span className="text-[#B83232]">*</span>}
      </label>
      <div className="relative mt-1.5">
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={onToggle}
          className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[14px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-60 ${
            isOpen
              ? "border-[#141416] bg-white text-[#141416] shadow-[0_0_0_3px_rgba(20,20,22,0.06)]"
              : "border-[#E5E0DA] bg-[#F6F4F1] text-[#141416] hover:border-[#CFC8BF]"
          }`}
        >
          <span className="truncate font-medium">{displayLabel}</span>
          <ChevronDownIcon rotated={isOpen} />
        </button>

        {isOpen && (
          <div
            role="listbox"
            aria-label={label}
            className={`absolute left-0 z-30 w-full min-w-[210px] rounded-2xl border border-[#E5E0DA] bg-white p-1.5 shadow-[0_18px_36px_-18px_rgba(20,20,22,0.18)] ${
              placement === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
            }`}
          >
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {options.map((opt) => {
                const selected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onSelect(opt.value)}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                      selected
                        ? "bg-[#141416] font-semibold text-white"
                        : "font-medium text-[#141416] hover:bg-[#F4F1EE]"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {selected && <CheckIcon />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FilterDropdown;
