import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const STORAGE_KEY = 'marquinhos-list-view';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function readView(uid, name) {
  if (!uid) return 'list';
  return readAll()[`${uid}:${name}`] === 'cards' ? 'cards' : 'list';
}

export function useViewMode(name) {
  const { user } = useAuth();
  const uid = user?.uid || '';
  const [view, setView] = useState(() => readView(uid, name));

  useEffect(() => {
    setView(readView(uid, name));
  }, [uid, name]);

  function change(next) {
    const value = next === 'cards' ? 'cards' : 'list';
    setView(value);
    if (!uid) return;
    const all = readAll();
    all[`${uid}:${name}`] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  return [view, change];
}
