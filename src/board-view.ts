import { type QueryController, type BasesPropertyId, type BasesViewConfig, type TFile, BasesView, Notice, parsePropertyId } from "obsidian";
import { mount, unmount } from "svelte";
import Board from "./components/Board.svelte";
import {
	setBoardState,
	type CardContext,
	type ColumnData,
} from "./board-state.svelte";

// eslint-disable-next-line obsidianmd/hardcoded-config-path -- reverse-domain ID, not a config path
const VIEW_TYPE = "dev.kotchourko.obsidian.kanban";

// BasesViewConfig exposes groupBy at runtime but the public .d.ts types it as `{}`.
// Isolated here so there's one place to update when the API adds a proper accessor.
function getGroupByPropertyId(config: BasesViewConfig): BasesPropertyId | null {
	const groupBy = (config as unknown as { groupBy?: { property?: BasesPropertyId } }).groupBy;
	return groupBy?.property ?? null;
}

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
			setBoardState({ columns: [], hasGrouping: false, cardContext: null });
			return;
		}

		const visibleProperties = this.data.properties;
		const displayNames = new Map<BasesPropertyId, string>();
		for (const prop of visibleProperties) {
			displayNames.set(prop, this.config.getDisplayName(prop));
		}

		const openFile = (file: TFile, newTab: boolean): void => {
			void this.app.workspace.openLinkText(
				file.path,
				"",
				newTab ? "tab" : false,
			);
		};

		const moveCard = (file: TFile, targetColumnKey: string, targetHasKey: boolean): void => {
			const groupByPropId = getGroupByPropertyId(this.config);
			if (!groupByPropId) return;
			const { type, name } = parsePropertyId(groupByPropId);
			if (type !== "note") return;
			this.app.fileManager
				.processFrontMatter(file, (fm: Record<string, unknown>) => {
					if (targetHasKey) {
						fm[name] = targetColumnKey;
					} else {
						delete fm[name];
					}
				})
				.catch(() => {
					new Notice(`Kanban: failed to move "${file.basename}"`);
				});
		};

		const cardContext: CardContext = {
			properties: visibleProperties,
			displayNames,
			renderContext: this.app.renderContext,
			openFile,
			moveCard,
		};

		const columns: ColumnData[] = groups
			.map((group) => ({
				key: group.hasKey() ? (group.key?.toString() ?? "") : "Uncategorized",
				hasKey: group.hasKey(),
				entries: group.entries,
			}))
			.filter((col) => col.hasKey || col.entries.length > 0)
			.sort((a, b) => {
				if (a.hasKey === b.hasKey) return 0;
				return a.hasKey ? 1 : -1;
			});

		setBoardState({ columns, hasGrouping: true, cardContext });
	}
}

export { VIEW_TYPE };
