interface WardenPlaceholderPageProps {
  title: string
  description: string
}

export function WardenPlaceholderPage({ title, description }: WardenPlaceholderPageProps) {
  return (
    <div className="p-8">
      <div className="glass-panel max-w-2xl p-8">
        <h1 className="dashboard-heading text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="dashboard-subheading mt-3 text-sm">{description}</p>
      </div>
    </div>
  )
}
