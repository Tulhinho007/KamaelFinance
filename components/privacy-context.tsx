"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface PrivacyContextType {
  isPrivate: boolean;
  togglePrivacy: () => void;
  setPrivacy: (value: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
  isPrivate: false,
  togglePrivacy: () => {},
  setPrivacy: () => {},
});

const STORAGE_KEY = "kamael-privacy-mode";

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivate, setIsPrivateState] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsPrivateState(stored === "true");
      }
    } catch {
      // Ignora erro de acesso a localStorage
    }
    setMounted(true);
  }, []);

  const setPrivacy = (value: boolean) => {
    setIsPrivateState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignora erro
    }
  };

  const togglePrivacy = () => {
    setPrivacy(!isPrivate);
  };

  return (
    <PrivacyContext.Provider
      value={{
        isPrivate: mounted ? isPrivate : false,
        togglePrivacy,
        setPrivacy,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacyMode() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacyMode deve ser usado dentro de um PrivacyProvider");
  }
  return context;
}
