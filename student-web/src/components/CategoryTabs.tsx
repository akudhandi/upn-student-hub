"use client";

import { CheckIcon, ChevronDownIcon } from "@/components/FilterDropdown";

export type CategoryOption = {
  id: number;
  name: string;
};

export type CategoryTabsProps = {
  ariaLabel: string;
  overflowMenuLabel: string;
  primaryCategories: CategoryOption[];
  overflowCategories: CategoryOption[];
  activeCategoryId: number | null;
  isOverflowOpen: boolean;
  onSelectCategory: (id: number | null) => void;
  onToggleOverflow: () => void;
};

export function CategoryTabs({
  ariaLabel,
  overflowMenuLabel,
  primaryCategories,
  overflowCategories,
  activeCategoryId,
  isOverflowOpen,
  onSelectCategory,
  onToggleOverflow,
}: CategoryTabsProps) {
  const activeOverflowCategory =
    overflowCategories.find((cat) => cat.id === activeCategoryId) ?? null;

  return (
    <div
      className="mt-5 hidden items-center border-t border-[#F1EDE8] pt-2 lg:flex"
      role="group"
      aria-label={ariaLabel}
    >
      <div className="flex flex-1 items-center gap-6 border-b border-[#F1EDE8]">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          aria-pressed={activeCategoryId === null}
          className={`-mb-px inline-flex min-h-[44px] items-center whitespace-nowrap rounded-t border-b-2 px-0.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 ${
            activeCategoryId === null
              ? "border-[#141416] font-semibold text-[#141416]"
              : "border-transparent font-medium text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
          }`}
        >
          Semua kategori
        </button>

        {primaryCategories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              aria-pressed={isActive}
              className={`-mb-px inline-flex min-h-[44px] items-center whitespace-nowrap rounded-t border-b-2 px-0.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 ${
                isActive
                  ? "border-[#141416] font-semibold text-[#141416]"
                  : "border-transparent font-medium text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
              }`}
            >
              {cat.name}
            </button>
          );
        })}

        {overflowCategories.length > 0 && (
          <div className="relative -mb-px">
            <button
              type="button"
              onClick={onToggleOverflow}
              aria-expanded={isOverflowOpen}
              aria-haspopup="menu"
              className={`inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-t border-b-2 px-0.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 ${
                activeOverflowCategory !== null || isOverflowOpen
                  ? "border-[#141416] font-semibold text-[#141416]"
                  : "border-transparent font-medium text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
              }`}
            >
              <span>
                {activeOverflowCategory
                  ? activeOverflowCategory.name
                  : `Kategori lain (${overflowCategories.length})`}
              </span>
              <ChevronDownIcon rotated={isOverflowOpen} />
            </button>

            {isOverflowOpen && (
              <div
                role="menu"
                aria-label={overflowMenuLabel}
                className="absolute left-0 top-[calc(100%+8px)] z-30 w-72 rounded-2xl border border-[#E5E0DA] bg-white p-2 shadow-[0_18px_36px_-18px_rgba(20,20,22,0.18)]"
              >
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {overflowCategories.map((cat) => {
                    const isActive = activeCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        onClick={() => onSelectCategory(cat.id)}
                        className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                          isActive
                            ? "bg-[#141416] font-semibold text-white"
                            : "font-medium text-[#141416] hover:bg-[#F4F1EE]"
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        {isActive && <CheckIcon />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoryTabs;
