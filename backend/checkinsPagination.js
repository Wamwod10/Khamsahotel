export function normalizeCheckinsPagination({ limit, offset } = {}) {
  const parsedLimit = Number(limit);
  const parsedOffset = Number(offset);
  const normalizedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.trunc(parsedLimit)
    : 300;

  return {
    limit: Math.min(normalizedLimit, 500),
    offset: Math.max(
      Number.isFinite(parsedOffset) ? Math.trunc(parsedOffset) : 0,
      0,
    ),
  };
}
