"use client";

import { useEffect } from "react";

export function useUnsavedChanges(dirty: boolean, pending: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return function guardNavigation(event: { preventDefault(): void }) {
    if (pending || (dirty && !window.confirm("Leave this editor without saving?"))) event.preventDefault();
  };
}
