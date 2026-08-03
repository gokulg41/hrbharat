"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type DemoModalContextType = {
  isOpen: boolean;
  openDemoModal: () => void;
  closeDemoModal: () => void;
};

const DemoModalContext = createContext<DemoModalContextType | undefined>(
  undefined
);

export function DemoModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDemoModal = () => setIsOpen(true);
  const closeDemoModal = () => setIsOpen(false);

  return (
    <DemoModalContext.Provider
      value={{ isOpen, openDemoModal, closeDemoModal }}
    >
      {children}
    </DemoModalContext.Provider>
  );
}

export function useDemoModal() {
  const context = useContext(DemoModalContext);
  if (!context) {
    throw new Error("useDemoModal must be used within a DemoModalProvider");
  }
  return context;
}
