import { useEffect, useState } from 'react';

export const PAGE_SIZE = 8;
export const PAGE_SIZES = [8, 10, 20];

export function usePagedList(items, resetKey = '') {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSizeState] = useState(PAGE_SIZE);
  const list = items || [];
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize) || 1);
  const current = Math.min(page, pageCount - 1);
  const rows = list.slice(current * pageSize, current * pageSize + pageSize);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  function setPageSize(next) {
    const size = Number(next);
    setPageSizeState(PAGE_SIZES.includes(size) ? size : PAGE_SIZE);
    setPage(0);
  }

  return { rows, current, pageCount, setPage, pageSize, setPageSize };
}
