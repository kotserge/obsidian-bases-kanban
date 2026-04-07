import { Plugin } from "obsidian";
import { BoardView, VIEW_TYPE } from "./board-view";

export default class ObsidianKanban extends Plugin {
	async onload() {
		const registered = this.registerBasesView(VIEW_TYPE, {
			name: "Kanban",
			icon: "square-kanban",
			factory: (controller, containerEl) => {
				return new BoardView(controller, containerEl);
			},
		});

		if (!registered) {
			console.warn("obsidian-kanban: failed to register Bases view");
		}
	}

	onunload() {}
}
