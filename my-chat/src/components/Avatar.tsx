import { useEffect, useState } from 'react'
import { colorFor } from '../colors'
import { avatarUrl } from '../avatars'

type Props = {
  id: string
  name: string
  path?: string | null
  size?: number
  className?: string
}

// A round picture, or the colored initial circle when there is no picture
export default function Avatar({ id, name, path, size = 32, className = '' }: Props) {
  const url = avatarUrl(path)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [url])

  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) }

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        style={style}
        className={`shrink-0 rounded-full bg-[#1e1f22] object-cover ${className}`}
      />
    )
  }

  return (
    <span
      style={style}
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ${colorFor(id)} ${className}`}
    >
      {name[0]?.toUpperCase() ?? '?'}
    </span>
  )
}