import { supabase } from './supabase'

const AVATAR_SIZE = 256

// Turns a stored file path into a link the browser can load
export function avatarUrl(path?: string | null): string | null {
  if (!path) return null
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality))
}

// Crops to a centered square and shrinks to 256x256, so uploads stay tiny
export async function makeAvatarBlob(file: File): Promise<{ blob: Blob; ext: 'webp' | 'jpg' }> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 15 * 1024 * 1024) throw new Error('That image is too large (15 MB max).')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error("Couldn't read that image. Try a JPG or PNG.")
  }

  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Your browser cannot process images.')
  }

  const side = Math.min(bitmap.width, bitmap.height)
  ctx.fillStyle = '#1e1f22' // behind transparent areas
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE
  )
  bitmap.close()

  // Safari can't save WebP, so fall back to JPEG there
  const webp = await toBlob(canvas, 'image/webp', 0.85)
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' }
  const jpg = await toBlob(canvas, 'image/jpeg', 0.85)
  if (!jpg) throw new Error('Could not process that image.')
  return { blob: jpg, ext: 'jpg' }
}