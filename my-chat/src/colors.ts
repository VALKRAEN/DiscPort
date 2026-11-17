const colors = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-violet-500',
]

// Same user id always gives the same color
export function colorFor(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return colors[h % colors.length]
}