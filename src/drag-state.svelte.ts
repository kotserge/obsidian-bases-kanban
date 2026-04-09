import type { TFile } from "obsidian";

export interface DragState {
	file: TFile;
	sourceColumnKey: string;
}

let dragState = $state<DragState | null>(null);

export function getDragState(): DragState | null {
	return dragState;
}

export function setDragState(state: DragState | null): void {
	dragState = state;
}
