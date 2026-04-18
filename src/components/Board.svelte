<script lang="ts">
	import { getBoardState } from "../board-state.svelte";
	import Column from "./Column.svelte";

	const state = $derived(getBoardState());
</script>

<div class="kanban-board">
	{#if !state.hasGrouping}
		<div class="kanban-board-empty">
			Group by a property to create columns
		</div>
	{:else if state.columns.length === 0 || !state.cardContext}
		<div class="kanban-board-empty">
			No data
		</div>
	{:else}
		{@const cardContext = state.cardContext}
		{#each state.columns as column (column.key)}
			<Column {column} {cardContext} />
		{/each}
	{/if}
</div>
