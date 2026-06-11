interface PathSegment {
  from: string
  to: string
  distance: number
}

interface PathResult {
  distance: number
  path: PathSegment[]
}

interface Props {
  pathFrom: string | null
  pathTo: string | null
  loading: boolean
  result: PathResult | null
  error: string | null
  onClear: () => void
}

export default function PathPanel({ pathFrom, pathTo, loading, result, error, onClear }: Props) {
  const instruction = !pathFrom
    ? 'Click a node to set the origin'
    : !pathTo
      ? 'Click another node to set the destination'
      : null

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Find Path</h2>
        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-0.5"
        >
          Clear
        </button>
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-8 text-xs font-semibold text-amber-600 uppercase">From</span>
          {pathFrom ? (
            <span className="flex-1 font-medium text-gray-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
              {pathFrom}
            </span>
          ) : (
            <span className="flex-1 text-gray-400 italic text-xs">not selected</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-8 text-xs font-semibold text-orange-600 uppercase">To</span>
          {pathTo ? (
            <span className="flex-1 font-medium text-gray-800 bg-orange-50 border border-orange-200 rounded px-2 py-0.5">
              {pathTo}
            </span>
          ) : (
            <span className="flex-1 text-gray-400 italic text-xs">not selected</span>
          )}
        </div>
      </div>

      {instruction && (
        <p className="px-4 text-xs text-gray-500 italic">{instruction}</p>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Calculating…
        </div>
      )}

      {error && (
        <div className="px-4 py-3">
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="px-4 py-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total distance
            </span>
            <span className="text-lg font-bold text-indigo-600">{result.distance}</span>
          </div>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hops</p>
          <ol className="space-y-1">
            {result.path.map((seg, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-gray-700">
                  <span className="font-medium">{seg.from}</span>
                  <span className="text-gray-400 mx-1">→</span>
                  <span className="font-medium">{seg.to}</span>
                </span>
                <span className="text-gray-500 text-xs">{seg.distance}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
