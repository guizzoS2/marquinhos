import { useEffect, useState } from 'react';

export const PAGE_SIZE = 8;

export function usePagedList(items, resetKey = '') {
  const [page, setPage] = useState(0);
  const list = items || [];
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE) || 1);
  const current = Math.min(page, pageCount - 1);
  const rows = list.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  return { rows, current, pageCount, setPage };
}
