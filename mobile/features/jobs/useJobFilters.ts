import { create } from "zustand";
import type { JobFilters } from "@/types/jobs";

type JobFilterState = JobFilters & {
  setQuery: (query: string) => void;
  setCategory: (category: JobFilters["category"]) => void;
  setLocation: (location: string) => void;
  toggleOnlySaved: () => void;
  reset: () => void;
};

const initialState: JobFilters = {
  query: "",
  category: "All",
  location: "All locations",
  onlySaved: false,
};

export const useJobFilters = create<JobFilterState>((set) => ({
  ...initialState,
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
  setLocation: (location) => set({ location }),
  toggleOnlySaved: () => set((state) => ({ onlySaved: !state.onlySaved })),
  reset: () => set(initialState),
}));
