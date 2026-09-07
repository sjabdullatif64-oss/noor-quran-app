export function patchRecordById<T extends { id: string }>(
  records: readonly T[],
  id: string,
  updates: Partial<Omit<T, "id">>,
): { index: number; record: T } {
  const normalizedId = id.trim();
  const matches = records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.id.trim() === normalizedId);

  if (matches.length === 0) {
    throw new Error(`Campaign ${normalizedId} not found`);
  }
  if (matches.length > 1) {
    throw new Error(`Campaign ${normalizedId} is not unique`);
  }

  const { record, index } = matches[0];
  return {
    index,
    record: { ...record, ...updates, id: normalizedId },
  };
}

export function findRecordIndexById<T extends { id?: string }>(
  records: readonly T[],
  id: string,
): number {
  const normalizedId = id.trim();
  const matches = records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.id?.trim() === normalizedId);

  if (matches.length === 0) {
    throw new Error(`Campaign ${normalizedId} not found`);
  }
  if (matches.length > 1) {
    throw new Error(`Campaign ${normalizedId} is not unique`);
  }
  return matches[0].index;
}