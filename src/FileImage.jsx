import { useEffect, useState } from "react";
import { getFileObjectUrl } from "./api";

// <img> that also works for backend paths ("/files/..."), which need the login token
export default function FileImage({ src, alt, className }) {
  const needsToken = src.startsWith("/");
  const [loaded, setLoaded] = useState({ src: null, url: null, failed: false });

  useEffect(() => {
    if (!needsToken) return undefined;
    let url = null;
    let cancelled = false;
    getFileObjectUrl(src)
      .then((objectUrl) => {
        url = objectUrl;
        if (cancelled) URL.revokeObjectURL(objectUrl);
        else setLoaded({ src, url: objectUrl, failed: false });
      })
      .catch(() => !cancelled && setLoaded({ src, url: null, failed: true }));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src, needsToken]);

  if (!needsToken) return <img src={src} alt={alt} className={className} loading="lazy" />;
  if (loaded.src !== src) return <span className="spinner" role="status" aria-label="Loading image" />;
  if (loaded.failed) return <span className="muted">Image unavailable</span>;
  return <img src={loaded.url} alt={alt} className={className} />;
}
