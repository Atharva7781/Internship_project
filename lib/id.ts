export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

