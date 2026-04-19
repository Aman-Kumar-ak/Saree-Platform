import { useEffect, useState } from 'react'
import {
  cancelCachedImageRequest,
  releaseCachedImage,
  resolveCachedImage,
} from '../lib/imageCache.js'

export default function CachedImage({
  src,
  alt,
  version,
  className = '',
  imageClassName = '',
  loading = 'lazy',
  decoding = 'async',
  onClick,
  onError,
}) {
  const [resolvedSrc, setResolvedSrc] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!src) return undefined

    let cancelled = false
    let currentResolved = ''

    resolveCachedImage(src, version).then((nextSrc) => {
      if (cancelled) return
      currentResolved = nextSrc
      setResolvedSrc(nextSrc)
    })

    return () => {
      cancelled = true
      if (currentResolved.startsWith('blob:')) {
        releaseCachedImage(src, version)
      } else {
        cancelCachedImageRequest(src, version)
      }
    }
  }, [src, version])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        aria-hidden
        className={`absolute inset-0 bg-[linear-gradient(135deg,rgba(250,250,249,0.92),rgba(231,229,228,0.74))] transition-opacity duration-900 ease-out ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <div
        aria-hidden
        className={`absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.75),rgba(228,228,231,0.45))] transition-opacity duration-900 ease-out ${
          loaded ? 'opacity-0' : 'opacity-65'
        }`}
      />
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={alt}
          loading={loading}
          decoding={decoding}
          onClick={onClick}
          onError={onError}
          onLoad={() => setLoaded(true)}
          className={`${imageClassName} transition-[opacity,transform,filter] duration-900 ease-out ${
            loaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-[2px] scale-[1.02]'
          }`}
        />
      ) : null}
    </div>
  )
}
