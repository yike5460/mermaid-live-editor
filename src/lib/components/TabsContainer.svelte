<script lang="ts">
  import { stateStore, updateCodeStore } from '$lib/util/state';
  import type { EditorPage } from '$lib/types';
  import { nanoid } from 'nanoid';

  let editingTabId: string | null = null;
  let editingTabName = '';

  const defaultDiagramTemplate = `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B`;

  function addNewPage() {
    const newPage: EditorPage = {
      id: nanoid(),
      name: 'New Page',
      code: defaultDiagramTemplate,
      mermaid: '{\n  "theme": "default"\n}'
    };

    updateCodeStore({
      pages: [...$stateStore.pages, newPage],
      activePageId: newPage.id
    });
  }

  function setActivePage(pageId: string) {
    updateCodeStore({ activePageId: pageId });
  }

  function startEditing(page: EditorPage) {
    editingTabId = page.id;
    editingTabName = page.name;
  }

  function finishEditing() {
    if (editingTabId) {
      const updatedPages = $stateStore.pages.map(page => 
        page.id === editingTabId 
          ? { ...page, name: editingTabName || 'Untitled' }
          : page
      );
      updateCodeStore({ pages: updatedPages });
    }
    editingTabId = null;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      finishEditing();
    }
  }

  function removePage(pageId: string) {
    if ($stateStore.pages.length <= 1) return; // Don't remove the last page
    
    const updatedPages = $stateStore.pages.filter(p => p.id !== pageId);
    const newActiveId = pageId === $stateStore.activePageId 
      ? updatedPages[0].id 
      : $stateStore.activePageId;
      
    updateCodeStore({
      pages: updatedPages,
      activePageId: newActiveId
    });
  }
</script>

<div class="flex items-center border-b border-gray-200 dark:border-gray-700 bg-base-200 rounded-t-lg">
  <div class="flex flex-1 overflow-x-auto">
    {#each $stateStore.pages as page}
      <div 
        class="group flex items-center h-8 px-3 cursor-pointer border-r border-gray-200 dark:border-gray-700 text-sm {
          page.id === $stateStore.activePageId 
            ? 'bg-base-100 text-primary font-medium' 
            : 'hover:bg-base-100/50'
        }"
        on:click={() => setActivePage(page.id)}
      >
        {#if editingTabId === page.id}
          <input
            type="text"
            bind:value={editingTabName}
            on:blur={finishEditing}
            on:keydown={handleKeyDown}
            class="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary w-24 px-1 text-sm"
            autofocus
          />
        {:else}
          <span 
            on:dblclick={() => startEditing(page)}
            class="px-1 truncate max-w-[120px]"
          >
            {page.name}
          </span>
        {/if}
        {#if $stateStore.pages.length > 1}
          <button
            class="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100"
            on:click|stopPropagation={() => removePage(page.id)}
          >
            ×
          </button>
        {/if}
      </div>
    {/each}
  </div>
  <button
    class="h-8 px-3 text-gray-600 dark:text-gray-300 hover:bg-base-100/50 text-sm"
    on:click={addNewPage}
  >
    +
  </button>
</div> 