import { LIMITS } from '../config/site';
import { checkImageFile } from '../lib/fileCheck';

/** Returns an error message, or null if the file is an acceptable image. */
export async function checkFile(file: File): Promise<string | null> {
  const r = await checkImageFile(file, LIMITS.maxFileBytes);
  return r.ok ? null : r.message;
}
