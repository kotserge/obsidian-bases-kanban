import { Notice, Plugin } from "obsidian";
import { BoardView, VIEW_TYPE } from "./board-view";

export default class ObsidianKanban extends Plugin {
	onload() {
		const registered = this.registerBasesView(VIEW_TYPE, {
			name: "Kanban",
			icon: "square-kanban",
			factory: (controller, containerEl) => {
				return new BoardView(controller, containerEl);
			},
		});

		if (!registered) {
			new Notice(
				"Kanban: failed to register bases view — bases may not be available",
			);
		}
	}
}
