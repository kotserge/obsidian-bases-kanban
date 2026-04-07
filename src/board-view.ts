import { type QueryController, BasesView } from "obsidian";
import { mount, unmount } from "svelte";
import Board from "./components/Board.svelte";
import { setBoardState, type ColumnData } from "./board-state.svelte";

// eslint-disable-next-line obsidianmd/hardcoded-config-path -- reverse-domain ID, not a config path
const VIEW_TYPE = "dev.kotchourko.obsidian.kanban";

export class BoardView extends BasesView {
	type = VIEW_TYPE;

	private containerEl: HTMLElement;
	private boardComponent: Record<string, unknown> | null = null;

	constructor(controller: QueryController, containerEl: HTMLElement) {
		super(controller);
		this.containerEl = containerEl;
	}

	override onload(): void {
		this.boardComponent = mount(Board, { target: this.containerEl });
	}

	override onunload(): void {
		if (this.boardComponent) {
			void unmount(this.boardComponent);
			this.boardComponent = null;
		}
		this.containerEl.empty();
	}

	onDataUpdated(): void {
		const groups = this.data.groupedData;

		const noGrouping =
			groups.length === 1 && groups[0] !== undefined && !groups[0].hasKey();

		if (noGrouping) {
			setBoardState({ columns: [], hasGrouping: false });
			return;
		}

		const columns: ColumnData[] = groups.map((group) => ({
			key: group.hasKey() ? (group.key?.toString() ?? "") : "Uncategorized",
			hasKey: group.hasKey(),
			entryCount: group.entries.length,
		}));

		setBoardState({ columns, hasGrouping: true });
	}
}

export { VIEW_TYPE };
