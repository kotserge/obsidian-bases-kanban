<script lang="ts">
	import type { ColumnData, CardContext } from "../board-state.svelte";
	import Card from "./Card.svelte";

	let { column, cardContext }: { column: ColumnData; cardContext: CardContext } = $props();
</script>

<div class="kanban-column">
	<div class="kanban-column-header">
		<span class="kanban-column-title">{column.key}</span>
		<span class="kanban-column-count">{column.entries.length}</span>
	</div>
	<div class="kanban-column-items">
		{#each column.entries as entry (entry.file.path)}
			<Card {entry} {cardContext} />
		{/each}
	</div>
</div>
