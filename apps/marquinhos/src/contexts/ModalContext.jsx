import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState({ type: null, payload: null });

  const openModal = useCallback((type, payload = null) => {
    setModal({ type, payload });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ type: null, payload: null });
  }, []);

  const value = useMemo(
    () => ({
      modal,
      isOpen: Boolean(modal.type),
      openModal,
      closeModal,
    }),
    [modal, openModal, closeModal]
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return ctx;
}
