"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type SimpleEmployee = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
};

type ActingUserContextValue = {
  employees: SimpleEmployee[];
  actingUserId: string | null;
  actingUser: SimpleEmployee | null;
  setActingUserId: (id: string) => void;
  loading: boolean;
};

const ActingUserContext = createContext<ActingUserContextValue>({
  employees: [],
  actingUserId: null,
  actingUser: null,
  setActingUserId: () => {},
  loading: true,
});

const STORAGE_KEY = "hyrnix.actingUserId";

export function ActingUserProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);
  const [actingUserId, setActingUserIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        const all: SimpleEmployee[] = data.employees ?? [];
        setEmployees(all);

        let stored: string | null = null;
        try {
          stored = localStorage.getItem(STORAGE_KEY);
        } catch {
          // ignore (private browsing, etc.)
        }

        const adminOrHr = all.filter((e) => e.role === "ADMIN" || e.role === "HR");
        const initial = (stored && all.some((e) => e.id === stored)) ? stored : adminOrHr[0]?.id ?? all[0]?.id ?? null;
        setActingUserIdState(initial);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function setActingUserId(id: string) {
    setActingUserIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }

  const actingUser = employees.find((e) => e.id === actingUserId) ?? null;

  return (
    <ActingUserContext.Provider value={{ employees, actingUserId, actingUser, setActingUserId, loading }}>
      {children}
    </ActingUserContext.Provider>
  );
}

export function useActingUser() {
  return useContext(ActingUserContext);
}
