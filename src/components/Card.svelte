<script lang="ts">
	import type { BasesEntry } from "obsidian";
	import type { CardContext } from "../board-state.svelte";

	let { entry, cardContext }: { entry: BasesEntry; cardContext: CardContext } = $props();

	function renderValue(node: HTMLElement, propertyId: string) {
		const value = entry.getValue(propertyId as any);
		if (value) {
			value.renderTo(node, cardContext.renderContext);
		}
	}
</script>

<div class="kanban-card">
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
