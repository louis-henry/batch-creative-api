import { create } from 'zustand';

const MAX_REFS = 2;

interface BatchState {
  products: File[];
  refs: File[];
  concurrency: number;
  chaos: boolean;
  jobId: string | null;
  addProducts: (files: File[]) => void;
  addRefs: (files: File[]) => void;
  removeProduct: (index: number) => void;
  removeRef: (index: number) => void;
  setConcurrency: (n: number) => void;
  setChaos: (value: boolean) => void;
  setJobId: (id: string | null) => void;
}

export const useBatchStore = create<BatchState>((set) => ({
  products: [],
  refs: [],
  concurrency: 4,
  chaos: false,
  jobId: null,
  addProducts: (files) => set((s) => ({ products: [...s.products, ...files] })),
  addRefs: (files) => set((s) => ({ refs: [...s.refs, ...files].slice(0, MAX_REFS) })),
  removeProduct: (index) => set((s) => ({ products: s.products.filter((_, i) => i !== index) })),
  removeRef: (index) => set((s) => ({ refs: s.refs.filter((_, i) => i !== index) })),
  setConcurrency: (concurrency) => set({ concurrency }),
  setChaos: (chaos) => set({ chaos }),
  setJobId: (jobId) => set({ jobId }),
}));
