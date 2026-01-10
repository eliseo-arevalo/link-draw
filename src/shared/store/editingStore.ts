import { create } from "zustand";

interface EditingState {
	editingNodeId: string | null;
	setEditingNodeId: (id: string | null) => void;
}

export const useEditingStore = create<EditingState>((set) => ({
	editingNodeId: null,
	setEditingNodeId: (id) => set({ editingNodeId: id }),
}));
