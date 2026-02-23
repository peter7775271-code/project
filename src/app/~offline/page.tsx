import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
        <p className="text-sm leading-6 text-slate-600">
          Praxis AI can&apos;t reach the network right now. Reconnect to continue syncing your progress, or head back home to view anything already cached.
        </p>
        <div>
          <Link
            href="/"
            className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
