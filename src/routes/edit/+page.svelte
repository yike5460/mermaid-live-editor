<script lang="ts">
  import { base } from '$app/paths';
  import Actions from '$lib/components/Actions.svelte';
  import Card from '$lib/components/Card/Card.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import History from '$lib/components/History/History.svelte';
  import Navbar from '$lib/components/Navbar.svelte';
  import Preset from '$lib/components/Preset.svelte';
  import View from '$lib/components/View.svelte';
  import type { EditorMode, Tab } from '$lib/types';
  import { inputStateStore, stateStore, updateCodeStore } from '$lib/util/state';
  import { cmdKey, initHandler, syncDiagram } from '$lib/util/util';
  import { onMount } from 'svelte';
  import AIEditor from '$lib/components/AIEditor.svelte';
  import TabsContainer from '$lib/components/TabsContainer.svelte';
  import SEO from '$lib/components/SEO.svelte';

  let activeTabID = $state('code');
  stateStore.subscribe(({ editorMode }) => {
    activeTabID = editorMode;
  });

  const tabSelectHandler = (tab: Tab) => {
    const editorMode: EditorMode =
      tab.id === 'code' ? 'code' : tab.id === 'config' ? 'config' : 'ai';
    updateCodeStore({ editorMode });
  };

  const tabs: Tab[] = [
    {
      id: 'code',
      title: 'Code',
      icon: 'fas fa-code'
    },
    {
      id: 'config',
      title: 'Config',
      icon: 'fas fa-cogs'
    },
    {
      id: 'ai',
      title: 'Inspire by AI',
      icon: 'fas fa-magic'
    }
  ];

  onMount(async () => {
    await initHandler();
    const resizer = document.querySelector<HTMLElement>('#resizeHandler');
    const element = document.querySelector<HTMLElement>('#editorPane');
    if (!resizer || !element) {
      console.debug('Failed to find resize handler or editor pane', { resizer, element });
      return;
    }
    const resize = ({ pageX }: { pageX: number }) => {
      const newWidth = pageX - element.getBoundingClientRect().left;
      if (newWidth > 50) {
        element.style.width = `${newWidth}px`;
      }
    };

    const stopResize = () => {
      window.removeEventListener('mousemove', resize);
    };
    resizer.addEventListener('mousedown', (event) => {
      event.preventDefault();
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResize);
    });
  });
</script>

<SEO
  title="Mermaid Editor - Create and Edit Diagrams Online"
  description="Create, edit and share flowcharts, sequence diagrams, class diagrams, and more using our interactive Mermaid diagram editor. Real-time preview and collaboration features."
  path="/edit" />

<div class="flex h-full flex-col overflow-hidden">
  <Navbar />
  <div class="flex flex-1 overflow-hidden">
    <div class="hidden flex-col md:flex" id="editorPane" style="width: 40%">
      <Card onselect={tabSelectHandler} {tabs} isClosable={false} {activeTabID} title="Mermaid">
        {#snippet actions()}
          <div class="flex flex-row items-center">
            <div class="form-control flex-row items-center">
              <label class="label cursor-pointer" for="autoSync">
                <span> Auto sync</span>
                <input
                  type="checkbox"
                  class="toggle {$stateStore.autoSync ? 'btn-secondary' : 'toggle-primary'} ml-1"
                  id="autoSync"
                  bind:checked={$inputStateStore.autoSync} />
              </label>
            </div>

            {#if !$stateStore.autoSync}
              <button
                class="btn btn-secondary btn-xs mr-1"
                title="Sync Diagram ({cmdKey} + Enter)"
                aria-label="Sync Diagram"
                data-cy="sync"
                onclick={syncDiagram}><i class="fas fa-sync"></i></button>
            {/if}
          </div>
        {/snippet}

        <div class="flex h-full flex-col">
          <TabsContainer />
          {#if activeTabID === 'ai'}
            <AIEditor />
          {:else}
            <Editor />
          {/if}
        </div>
      </Card>

      <div class="-mt-2">
        <Preset />
        <History />
        <Actions />
      </div>
    </div>
    <div id="resizeHandler" class="hidden md:block"></div>
    <div class="flex flex-1 flex-col overflow-hidden">
      <Card title="Diagram" isClosable={false}>
        {#snippet actions()}
          <div class="flex flex-row items-center gap-2">
            <label
              class="label flex cursor-pointer gap-1 py-0"
              title="Rough mode is in beta. Features like clickable nodes, Pan & Zoom, will be disabled."
              for="rough">
              <span>Rough</span>
              <input
                type="checkbox"
                class="toggle {$stateStore.rough ? 'btn-secondary' : 'toggle-primary'}"
                id="rough"
                bind:checked={$inputStateStore.rough} />
            </label>
            <label
              class="label flex cursor-pointer gap-1 py-0"
              title={$stateStore.rough ? 'Pan & Zoom is disabled in rough mode.' : ''}
              for="panZoom">
              <span>Pan & Zoom</span>
              <input
                type="checkbox"
                class="toggle {$stateStore.panZoom ? 'btn-secondary' : 'toggle-primary'}"
                id="panZoom"
                disabled={$stateStore.rough}
                bind:checked={$inputStateStore.panZoom} />
            </label>
            <a
              href={`${base}/view#${$stateStore.serialized}`}
              target="_blank"
              class="btn btn-secondary btn-xs gap-1"
              title="View diagram in new page"
              ><i class="fas fa-external-link-alt"></i>Full screen</a>
          </div>
        {/snippet}

        <div class="flex-1 overflow-auto">
          <View />
        </div>
      </Card>
      <div class="mx-2 rounded p-2 shadow md:hidden">
        Code editing not supported on mobile. Please use a desktop browser.
      </div>
    </div>
  </div>
</div>

<style>
  #resizeHandler {
    cursor: col-resize;
    padding: 0 2px;
  }

  #resizeHandler::after {
    width: 2px;
    height: 100%;
    top: 0;
    content: '';
    position: absolute;
    background-color: hsla(var(--b3));
    margin-left: -1px;
    transition-duration: 0.2s;
  }

  #resizeHandler:hover::after {
    margin-left: -2px;
    background-color: hsla(var(--p));
    width: 4px;
  }
</style>
