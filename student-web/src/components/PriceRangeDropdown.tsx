"use client";

import { CheckIcon, ChevronDownIcon } from "@/components/FilterDropdown";

export type PriceRangeOption = {
  readonly value: string;
  readonly label: string;
};

type PriceRangeDropdownProps = {
  id: string;
  label: string;
  dialogAriaLabel: string;
  presetsAriaLabel: string;
  customHeading: string;
  minInputId: string;
  maxInputId: string;
  minInputAriaLabel: string;
  maxInputAriaLabel: string;
  displayLabel: string;
  value: string;
  options: readonly PriceRangeOption[];
  isOpen: boolean;
  draftMin: string;
  draftMax: string;
  error: string | null;
  onToggle: () => void;
  onSelectPreset: (value: string) => void;
  onDraftMinChange: (value: string) => void;
  onDraftMaxChange: (value: string) => void;
  onApplyCustom: () => void;
};

export default function PriceRangeDropdown({
  id,
  label,
  dialogAriaLabel,
  presetsAriaLabel,
  customHeading,
  minInputId,
  maxInputId,
  minInputAriaLabel,
  maxInputAriaLabel,
  displayLabel,
  value,
  options,
  isOpen,
  draftMin,
  draftMax,
  error,
  onToggle,
  onSelectPreset,
  onDraftMinChange,
  onDraftMaxChange,
  onApplyCustom,
}: PriceRangeDropdownProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-[#57534E]">
        {label}
      </label>
      <div className="relative mt-1.5">
        <button
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={onToggle}
          className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[14px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
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
            role="dialog"
            aria-label={dialogAriaLabel}
            className="absolute left-0 top-[calc(100%+8px)] z-30 w-full min-w-[280px] rounded-2xl border border-[#E5E0DA] bg-white p-2.5 shadow-[0_18px_36px_-18px_rgba(20,20,22,0.18)] sm:w-[320px]"
          >
            <div className="space-y-1" role="listbox" aria-label={presetsAriaLabel}>
              {options.map((opt) => {
                const selected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onSelectPreset(opt.value)}
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

            <div className="mt-2.5 border-t border-[#F1EDE8] px-1 pt-3">
              <p className="text-[13px] font-semibold text-[#141416]">{customHeading}</p>
              <div
                className="mt-2 grid grid-cols-2 gap-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onApplyCustom();
                  }
                }}
              >
                <div>
                  <label htmlFor={minInputId} className="sr-only">
                    {minInputAriaLabel}
                  </label>
                  <div className="flex h-11 items-center gap-1.5 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-2.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                    <span className="text-[13px] font-semibold text-[#57534E]">Rp</span>
                    <input
                      id={minInputId}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={draftMin}
                      onChange={(e) => onDraftMinChange(e.target.value)}
                      placeholder="Minimal"
                      className="w-full min-w-0 bg-transparent text-[13px] font-medium text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor={maxInputId} className="sr-only">
                    {maxInputAriaLabel}
                  </label>
                  <div className="flex h-11 items-center gap-1.5 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-2.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                    <span className="text-[13px] font-semibold text-[#57534E]">Rp</span>
                    <input
                      id={maxInputId}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={draftMax}
                      onChange={(e) => onDraftMaxChange(e.target.value)}
                      placeholder="Maksimal"
                      className="w-full min-w-0 bg-transparent text-[13px] font-medium text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-2 text-[13px] font-medium text-[#B83232]">
                  {error}
                </p>
              )}

              <div className="mt-3 flex items-center justify-end gap-2">
                {(value !== "any" || draftMin !== "" || draftMax !== "") && (
                  <button
                    type="button"
                    onClick={() => onSelectPreset("any")}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={onApplyCustom}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[#141416] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
