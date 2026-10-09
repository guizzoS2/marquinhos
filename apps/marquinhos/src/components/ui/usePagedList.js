import { useEffect, useState } from 'react';

export const PAGE_SIZE = 8;
export const PAGE_SIZES = [8, 10, 20];
export const PAGE_AFTER = 10;

export function usePagedList(items, resetKey = '', options = {}) {
  const after = Number.isFinite(options.after) ? options.after : PAGE_AFTER;
  const initialSize = PAGE_SIZES.includes(options.pageSize) ? options.pageSize : PAGE_SIZE;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSizeState] = useState(initialSize);
  const list = items || [];
  const total = list.length;
  const paged = total > after;
  const pageCount = paged ? Math.max(1, Math.ceil(total / pageSize) || 1) : 1;
  const current = paged ? Math.min(page, pageCount - 1) : 0;
  const rows = paged ? list.slice(current * pageSize, current * pageSize + pageSize) : list;

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  function setPageSize(next) {
    const size = Number(next);
    setPageSizeState(PAGE_SIZES.includes(size) ? size : PAGE_SIZE);
    setPage(0);
  }

  return { rows, current, pageCount, setPage, pageSize, setPageSize, total, paged };
}
