interface ShellPagePlaceholderProps {
  title: string
  description?: string
}

export function ShellPagePlaceholder({ title, description }: ShellPagePlaceholderProps) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
      <h1 className="text-xl font-semibold text-[#1A1A2E]">{title}</h1>
      {description && <p className="mt-2 text-sm text-[#4B5563]">{description}</p>}
    </div>
  )
}
