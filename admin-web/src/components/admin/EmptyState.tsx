export default function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="font-display text-sm font-semibold text-[#141416]">
        {title}
      </p>
      <p className="mt-1 text-sm text-[#6E6A66]">{message}</p>
    </div>
  );
}
