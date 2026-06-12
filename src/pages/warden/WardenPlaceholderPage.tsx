interface WardenPlaceholderPageProps {
  title: string
  description: string
}

export function WardenPlaceholderPage({ title, description }: WardenPlaceholderPageProps) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
