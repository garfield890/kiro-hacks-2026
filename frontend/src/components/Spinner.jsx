export default function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 w-full">
      <div className="h-12 w-12 rounded-full border-4 border-zinc-700 border-t-blue-400 animate-spin" />
      <p className="text-sm text-zinc-400">Analyzing your exercise…</p>
    </div>
  )
}
