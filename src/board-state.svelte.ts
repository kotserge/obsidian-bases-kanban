export interface ColumnData {
	key: string;
	hasKey: boolean;
	entryCount: number;
}

export interface BoardState {
	columns: ColumnData[];
	hasGrouping: boolean;
}

let boardState = $state<BoardState>({ columns: [], hasGrouping: false });

export function getBoardState(): BoardState {
	return boardState;
}

export function setBoardState(state: BoardState): void {
	boardState = state;
}
