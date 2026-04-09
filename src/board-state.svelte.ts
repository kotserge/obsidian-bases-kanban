import type { BasesEntry, BasesPropertyId, RenderContext, TFile } from "obsidian";

export interface CardContext {
	properties: BasesPropertyId[];
	displayNames: Map<BasesPropertyId, string>;
	renderContext: RenderContext;
	openFile: (file: TFile, newTab: boolean) => void;
	moveCard: (file: TFile, targetColumnKey: string, targetHasKey: boolean) => void;
}

export interface ColumnData {
	key: string;
	hasKey: boolean;
	entries: BasesEntry[];
}

export interface BoardState {
	columns: ColumnData[];
	hasGrouping: boolean;
	cardContext: CardContext | null;
}

let boardState = $state<BoardState>({
	columns: [],
	hasGrouping: false,
	cardContext: null,
});

export function getBoardState(): BoardState {
	return boardState;
}

export function setBoardState(state: BoardState): void {
	boardState = state;
}
