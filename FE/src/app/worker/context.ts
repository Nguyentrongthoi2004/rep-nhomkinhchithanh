import { createContext } from "react";

export const WorkerViewContext = createContext<{
  viewMode: "mobile" | "pc";
  toggleViewMode: () => void;
}>({
  viewMode: "mobile",
  toggleViewMode: () => {},
});
