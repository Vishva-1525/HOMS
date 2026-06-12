export function EnvSetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 text-neutral-900">
      <div className="w-full max-w-lg space-y-4 rounded-lg border border-neutral-200 p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Supabase configuration required</h1>
        <p className="text-sm text-neutral-600">
          HOMS needs Supabase credentials before it can load. Create a <code className="rounded bg-neutral-100 px-1">.env</code>{' '}
          file in the project root:
        </p>
        <pre className="overflow-x-auto rounded-md bg-neutral-950 p-4 text-sm text-neutral-100">
{`cp .env.example .env

# Then edit .env with your Supabase project values:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <p className="text-sm text-neutral-600">
          Find these in the Supabase dashboard under <strong>Project Settings → API</strong>, then restart{' '}
          <code className="rounded bg-neutral-100 px-1">npm run dev</code>.
        </p>
      </div>
    </div>
  )
}
