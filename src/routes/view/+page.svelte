<script lang="ts">
  import View from '$lib/components/View.svelte';
  import { initHandler } from '$lib/util/util';
  import { onMount } from 'svelte';
  import SEO from '$lib/components/SEO.svelte';
  import { stateStore } from '$lib/util/state';

  let diagramTitle = '';

  stateStore.subscribe((state) => {
    const activePage = state.pages.find((p) => p.id === state.activePageId);
    if (activePage) {
      // Try to extract a title from the first line of the diagram code
      const firstLine = activePage.code.split('\n')[0];
      if (firstLine.includes('title')) {
        diagramTitle = firstLine.replace(/^.*title\s+/, '').replace(/["\[\]]/g, '');
      }
    }
  });

  onMount(initHandler);
</script>

<SEO
  title={diagramTitle ? `${diagramTitle} - Mermaid Diagram` : 'Mermaid Diagram Viewer'}
  description="View and share Mermaid diagrams in a clean, distraction-free interface. Perfect for presentations and documentation."
  path="/view" />

<View />
