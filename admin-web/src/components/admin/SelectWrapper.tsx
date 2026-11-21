import { ActionIcon } from "@/components/admin/ActionIcons";

export default function SelectWrapper({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative ${className}`.trim()}>
      {children}
      <ActionIcon
        name="chevron-down"
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#787470]"
      />
    </div>
  );
}
