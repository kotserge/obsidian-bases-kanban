<script lang="ts">
	import type { ColumnData, CardContext } from "../board-state.svelte";
	import { getDragState } from "../drag-state.svelte";
	import Card from "./Card.svelte";

	let { column, cardContext }: { column: ColumnData; cardContext: CardContext } = $props();

	let isDropTarget = $state(false);
	let dragOverCounter = 0;

	function handleDragOver(event: DragEvent) {
		const state = getDragState();
		if (!state || state.sourceColumnKey === column.key) return;
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = "move";
		}
	}

	function handleDragEnter(event: DragEvent) {
		const state = getDragState();
		if (!state || state.sourceColumnKey === column.key) return;
		event.preventDefault();
		dragOverCounter++;
		isDropTarget = true;
	}

	function handleDragLeave() {
		const state = getDragState();
		if (!state || state.sourceColumnKey === column.key) return;
		if (dragOverCounter > 0) dragOverCounter--;
		if (dragOverCounter === 0) {
			isDropTarget = false;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOverCounter = 0;
		isDropTarget = false;
		const state = getDragState();
		if (!state || state.sourceColumnKey === column.key) return;
		void cardContext.moveCard(state.file, column.key, column.hasKey);
	}
</script>

<div
	class="kanban-column"
	class:is-drop-target={isDropTarget}
	role="group"
	aria-label="{column.key} column"
	ondragover={handleDragOver}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<div class="kanban-column-header">
		<span class="kanban-column-title">{column.key}</span>
		<span class="kanban-column-count">{column.entries.length}</span>
	</div>
	<div class="kanban-column-items">
		{#each column.entries as entry (entry.file.path)}
			<Card {entry} {cardContext} columnKey={column.key} />
		{/each}
	</div>
</div>
