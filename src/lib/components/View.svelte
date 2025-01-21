<script lang="ts">
  import type { State, ValidatedState, EditorPage } from '$lib/types';
  import { recordRenderTime, shouldRefreshView } from '$lib/util/autoSync';
  import { render as renderDiagram } from '$lib/util/mermaid';
  import { inputStateStore, stateStore, updateCodeStore } from '$lib/util/state';
  import { logEvent, saveStatistics } from '$lib/util/stats';
  import { cmdKey } from '$lib/util/util';
  import type { MermaidConfig } from 'mermaid';
  import { onMount } from 'svelte';
  import panzoom from 'svg-pan-zoom';
  import { Svg2Roughjs } from 'svg2roughjs';
  import { isTouchDevice } from '$lib/util/util';

  let container: HTMLDivElement | undefined = $state();
  let view: HTMLDivElement | undefined = $state();
  let error = $state(false);
  let outOfSync = $state(false);
  let hide = $state(false);
  let manualUpdate = true;
  let panZoomEnabled = $state($stateStore.panZoom);
  let rough = $state($stateStore.rough);
  let pzoom: typeof panzoom | undefined;
  let currentCode = $state('');
  let currentConfig = $state('');

  function updateCurrentPage() {
    const activePage = $stateStore.pages.find((p) => p.id === $stateStore.activePageId);
    if (activePage) {
      currentCode = activePage.code;
      currentConfig = activePage.mermaid;
    }
  }

  $effect(() => {
    updateCurrentPage();
  });

  const activePage = $derived($stateStore.pages.find((p) => p.id === $stateStore.activePageId));
  const code = $derived(activePage?.code ?? '');
  const config = $derived(activePage?.mermaid ?? '');

  const handlePanZoomChange = () => {
    if (!pzoom) {
      return;
    }
    const pan = pzoom.getPan();
    const zoom = pzoom.getZoom();
    updateCodeStore({ pan, zoom });
    logEvent('panZoom');
  };

  const handlePanZoom = (state: State) => {
    if (!state.panZoom) {
      return;
    }
    hide = true;
    pzoom?.destroy();
    pzoom = undefined;
    void Promise.resolve().then(() => {
      const graphDiv = document.querySelector<HTMLElement>('#graph-div');
      if (!graphDiv) {
        return;
      }
      pzoom = panzoom(graphDiv, {
        onPan: handlePanZoomChange,
        onZoom: handlePanZoomChange,
        controlIconsEnabled: true,
        fit: true,
        center: true
      });
      const { pan, zoom } = state;
      if (pan !== undefined && zoom !== undefined && Number.isFinite(zoom)) {
        pzoom.zoom(zoom);
        pzoom.pan(pan);
      }
      hide = false;
    });
  };

  const handleStateChange = async (state: ValidatedState) => {
    const startTime = Date.now();
    if (state.error !== undefined) {
      error = true;
      return;
    }
    error = false;
    try {
      if (container && state && (state.updateDiagram || state.autoSync)) {
        if (!state.autoSync) {
          $inputStateStore.updateDiagram = false;
        }
        outOfSync = false;
        manualUpdate = true;

        const activePage = state.pages.find((p) => p.id === state.activePageId);
        if (!activePage) {
          console.error("active page doesn't exist");
          return;
        }

        // Do not render if there is no change in Code/Config/PanZoom
        if (
          currentCode === activePage.code &&
          currentConfig === activePage.mermaid &&
          panZoomEnabled === state.panZoom &&
          rough === state.rough
        ) {
          return;
        }

        if (!shouldRefreshView()) {
          outOfSync = true;
          return;
        }

        currentCode = activePage.code;
        currentConfig = activePage.mermaid;
        panZoomEnabled = state.panZoom ?? false;
        rough = state.rough;
        const scroll = view?.parentElement?.scrollTop;
        delete container.dataset.processed;
        const { svg, bindFunctions } = await renderDiagram(
          Object.assign({}, JSON.parse(activePage.mermaid)) as MermaidConfig,
          activePage.code,
          'graph-div'
        );

        if (svg.length > 0) {
          handlePanZoom(state);
          container.innerHTML = svg;
          const graphDiv = document.querySelector<SVGSVGElement>('#graph-div');
          if (!graphDiv) {
            throw new Error('graph-div not found');
          }
          if (state.rough) {
            const svg2roughjs = new Svg2Roughjs('#container');
            svg2roughjs.svg = graphDiv;
            await svg2roughjs.sketch();
            graphDiv.remove();
            const sketch = document.querySelector<HTMLElement>('#container > svg');
            if (!sketch) {
              throw new Error('sketch not found');
            }
            const height = sketch.getAttribute('height');
            const width = sketch.getAttribute('width');
            sketch.setAttribute('height', '100%');
            sketch.setAttribute('width', '100%');
            sketch.setAttribute('viewBox', `0 0 ${width} ${height}`);
            sketch.style.maxWidth = '100%';
          } else {
            graphDiv.setAttribute('height', '100%');
            graphDiv.style.maxWidth = '100%';
            if (bindFunctions) {
              bindFunctions(graphDiv);
            }
          }
        }
        if (view?.parentElement && scroll) {
          view.parentElement.scrollTop = scroll;
        }
        error = false;
      } else if (manualUpdate) {
        manualUpdate = false;
      } else if (currentCode !== state.code || currentConfig !== state.mermaid) {
        outOfSync = true;
      }
    } catch (error) {
      console.error('Error rendering diagram:', error);
    }
    const renderTime = Date.now() - startTime;
    saveStatistics({ code: currentCode, renderTime, isRough: state.rough });
    recordRenderTime(renderTime, () => {
      $inputStateStore.updateDiagram = true;
    });
  };

  const initPanZoom = (graphDiv: HTMLElement) => {
    if (!graphDiv) return;

    const options: any = {
      onPan: handlePanZoomChange,
      onZoom: handlePanZoomChange,
      controlIconsEnabled: !isTouchDevice(),
      minZoom: 0.1,
      maxZoom: 10,
      zoomScaleSensitivity: 0.4,
      dblClickZoomEnabled: !isTouchDevice(),
      preventMouseEventsDefault: true,
      touchAction: 'none'
    };

    if (isTouchDevice()) {
      options.beforePan = () => true;
      options.beforeZoom = () => true;
    }

    pzoom = panzoom(graphDiv, options);

    // Restore previous pan/zoom state if available
    if ($stateStore.pan && $stateStore.zoom) {
      pzoom.pan($stateStore.pan);
      pzoom.zoom($stateStore.zoom);
    }
  };

  // Handle touch events for mobile
  const handleTouchStart = (event: TouchEvent) => {
    if (!panZoomEnabled || event.touches.length !== 2) return;
    event.preventDefault();
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
    container?.setAttribute('data-pinch-start', distance.toString());
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!panZoomEnabled || event.touches.length !== 2) return;
    event.preventDefault();
    const startDistance = parseFloat(container?.getAttribute('data-pinch-start') || '0');
    if (!startDistance) return;

    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

    const scale = distance / startDistance;
    if (pzoom) {
      const currentZoom = pzoom.getZoom();
      pzoom.zoom(currentZoom * scale);
      container?.setAttribute('data-pinch-start', distance.toString());
    }
  };

  onMount(() => {
    stateStore.subscribe((state) => {
      void handleStateChange(state);
    });
    window.addEventListener('resize', () => {
      if ($stateStore.panZoom && pzoom) {
        pzoom.resize();
      }
    });

    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
      }
    };
  });
</script>

{#if outOfSync}
  <div
    class="font-monotext-yellow-600 absolute z-10 w-full bg-base-100 bg-opacity-80 p-2 text-left"
    id="errorContainer">
    Diagram out of sync. <br />
    {#if $stateStore.autoSync}
      It will be updated automatically.
    {:else}
      Press <i class="fas fa-sync"></i> (Sync button) or <kbd>{cmdKey} + Enter</kbd> to sync.
    {/if}
  </div>
{/if}

<div
  class="view-container prevent-select"
  bind:this={container}
  class:touch-scroll={isTouchDevice()}>
  <div id="view" bind:this={view}>
    {#if !hide}
      <div id="graph-div"></div>
    {/if}
  </div>
</div>

<style>
  #view {
    flex: 1;
  }

  #container {
    transition: visibility 0.3s;
  }

  .error,
  .outOfSync {
    opacity: 0.5;
  }

  .hide {
    visibility: hidden;
  }

  .view-container {
    width: 100%;
    height: 100%;
    position: relative;
    touch-action: none;
  }

  /* Mobile optimizations */
  @media (max-width: 640px) {
    .view-container {
      height: calc(100vh - var(--navbar-height));
    }

    :global(.svg-pan-zoom-control) {
      transform: scale(1.5);
      transform-origin: center;
    }
  }

  /* Prevent text selection during touch interactions */
  .prevent-select {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
</style>
