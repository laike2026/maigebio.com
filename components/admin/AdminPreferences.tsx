"use client";

import { createContext, useContext } from "react";

type Preferences = { timezone: string; dateFormat: string; pageSize: number };
const context = createContext<Preferences>({ timezone: "Asia/Shanghai", dateFormat: "yyyy-MM-dd", pageSize: 20 });
export function AdminPreferences({ value, children }: { value: Preferences; children: React.ReactNode }) { return <context.Provider value={value}>{children}</context.Provider>; }
export function useAdminPreferences() { return useContext(context); }
export function useAdminDate() {
  const { timezone, dateFormat } = useAdminPreferences();
  return (value: string | Date | null | undefined) => {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map((part) => [part.type, part.value]));
    const day = dateFormat === "dd/MM/yyyy" ? `${parts.day}/${parts.month}/${parts.year}` : dateFormat === "MM/dd/yyyy" ? `${parts.month}/${parts.day}/${parts.year}` : `${parts.year}-${parts.month}-${parts.day}`;
    return `${day} ${parts.hour}:${parts.minute}`;
  };
}
