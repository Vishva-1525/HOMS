interface ShellPagePlaceholderProps {
  title: string
  description?: string
}

export function ShellPagePlaceholder({ title, description }: ShellPagePlaceholderProps) {
  return (
    <div className="glass-panel-strong p-6">
      <h1 className="dashboard-heading text-xl font-semibold">{title}</h1>
      {description && <p className="dashboard-subheading mt-2 text-sm">{description}</p>}
    </div>
  )
}
