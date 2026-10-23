import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageLoadError, loadImageFile, type LoadedImage } from '../lib/image';

export function useImageFile() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const current = useRef<LoadedImage | null>(null);

  const load = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const img = await loadImageFile(file);
      current.current?.release();
      current.current = img;
      setImage(img);
    } catch (e) {
      setError(e instanceof ImageLoadError ? e.message : 'The image could not be opened in this browser.');
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = useCallback(() => {
    current.current?.release();
    current.current = null;
    setImage(null);
    setError(null);
  }, []);

  useEffect(() => () => current.current?.release(), []);

  return { image, error, busy, load, reset };
}
