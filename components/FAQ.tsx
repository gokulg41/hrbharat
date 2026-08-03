"use client";

import { createContext, useContext, useState, useCallback } from "react";
import DemoModal from "./DemoModal";

type DemoModalContextValue = {
  openDemoModal: () => void;
};

const DemoModalContext = createContext<DemoModalContextValue | null>(null);

export function DemoModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDemoModal = useCallback(() => setIsOpen(true), []);
  const closeDemoModal = useCallback(() => setIsOpen(false), []);

  return (
    <DemoModalContext.Provider value={{ openDemoModal }}>
      {children}
      <DemoModal isOpen={isOpen} onClose={closeDemoModal} />
    </DemoModalContext.Provider>
  );
}

export function useDemoModal() {
  const ctx = useContext(DemoModalContext);
  if (!ctx) {
    throw new Error("useDemoModal must be used within a DemoModalProvider");
  }
  return ctx;
}
