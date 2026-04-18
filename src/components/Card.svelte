<script lang="ts">
	import type { BasesEntry, BasesPropertyId } from "obsidian";
	import type { CardContext } from "../board-state.svelte";
	import { setDragState } from "../drag-state.svelte";

	let { entry, cardContext, columnKey }: { entry: BasesEntry; cardContext: CardContext; columnKey: string } = $props();

	let isDragging = $state(false);

	function handleClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.closest(".kanban-card-property-value")?.querySelector("a, button, input, select, textarea")) {
			return;
		}
		cardContext.openFile(entry.file, event.ctrlKey || event.metaKey);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			cardContext.openFile(entry.file, event.ctrlKey || event.metaKey);
		}
	}

	function handleDragStart(event: DragEvent) {
		if (!event.dataTransfer) return;
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", entry.file.path);
		isDragging = true;
		setDragState({ file: entry.file, sourceColumnKey: columnKey });
	}

	function handleDragEnd() {
		isDragging = false;
		setDragState(null);
	}

	function renderValue(node: HTMLElement, propertyId: BasesPropertyId) {
		function render(id: BasesPropertyId) {
			node.empty();
			const value = entry.getValue(id);
			if (value) {
				value.renderTo(node, cardContext.renderContext);
			}
		}
		render(propertyId);
		return {
			update(newPropertyId: BasesPropertyId) {
				render(newPropertyId);
			},
			destroy() {
				node.empty();
			},
		};
	}
</script>

<div class="kanban-card" class:is-dragging={isDragging} role="button" tabindex="0" draggable="true" onclick={handleClick} onkeydown={handleKeydown} ondragstart={handleDragStart} ondragend={handleDragEnd}>
	<div class="kanban-card-title">{entry.file.basename}</div>
	{#if cardContext.properties.length > 0}
		<div class="kanban-card-properties">
			{#each cardContext.properties as propertyId (propertyId)}
				{@const value = entry.getValue(propertyId)}
				{#if value && value.isTruthy()}
					<div class="kanban-card-property">
						<span class="kanban-card-property-value" use:renderValue={propertyId}>
						</span>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
