<script lang="ts">
	import type { BasesEntry } from "obsidian";
	import type { CardContext } from "../board-state.svelte";

	let { entry, cardContext }: { entry: BasesEntry; cardContext: CardContext } = $props();

	function handleClick(event: MouseEvent) {
		cardContext.openFile(entry.file, event.ctrlKey || event.metaKey);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			cardContext.openFile(entry.file, event.ctrlKey || event.metaKey);
		}
	}

	function renderValue(node: HTMLElement, propertyId: string) {
		const value = entry.getValue(propertyId as any);
		if (value) {
			value.renderTo(node, cardContext.renderContext);
		}
	}
</script>

<div class="kanban-card" role="button" tabindex="0" onclick={handleClick} onkeydown={handleKeydown}>
	<div class="kanban-card-title">{entry.file.basename}</div>
	{#if cardContext.properties.length > 0}
		<div class="kanban-card-properties">
			{#each cardContext.properties as propertyId}
				{@const value = entry.getValue(propertyId)}
				{#if value && value.isTruthy()}
					<div class="kanban-card-property">
						<span class="kanban-card-property-label">
							{cardContext.displayNames.get(propertyId) ?? ""}
						</span>
						<span class="kanban-card-property-value" use:renderValue={propertyId}>
						</span>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
