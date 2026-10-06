import { useEffect, useState } from "react";

let isClientHydrated = false;

export function useHydrated() {
  const [hydrated, setHydrated] = useState(isClientHydrated);
  useEffect(() => {
    isClientHydrated = true;
    setHydrated(true);
  }, []);
  return hydrated;
}

