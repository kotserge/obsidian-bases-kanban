import { type QueryController, BasesView } from "obsidian";
import { mount, unmount } from "svelte";
import Board from "./components/Board.svelte";

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
		// Stub — will render columns/cards in later features.
	}
}

export { VIEW_TYPE };
