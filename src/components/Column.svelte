<script lang="ts">
	import type { ColumnData } from "../board-state.svelte";

	let { column }: { column: ColumnData } = $props();
</script>

<div class="kanban-column">
	<div class="kanban-column-header">
		<span class="kanban-column-title">{column.key}</span>
		<span class="kanban-column-count">{column.entryCount}</span>
	</div>
	<div class="kanban-column-items">
		<!-- Card rendering in Feature 3 -->
	</div>
</div>
