<script lang="ts">
  import { stateStore, updateCodeStore } from '$lib/util/state';
  import { syncDiagram } from '$lib/util/util';
  
  let prompt = '';
  let generatedCode = '';
  let isGenerating = false;

  async function generateDiagram() {
    isGenerating = true;
    try {
      // TODO: Replace with actual AI API call
      // For now, just create a simple flowchart as an example
      generatedCode = `flowchart TD
    A[Start] --> B{Is it?}
    B -- Yes --> C[OK]
    C --> D[Rethink]
    D --> B
    B -- No --> E[End]`;
      
      updateCodeStore({ code: generatedCode });
      await syncDiagram();
    } catch (error) {
      console.error('Error generating diagram:', error);
    } finally {
      isGenerating = false;
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(generatedCode);
  }
</script>

<div class="flex h-full flex-col gap-4 p-4">
  <div class="flex flex-col gap-2">
    <label for="prompt" class="text-sm font-medium">Describe your diagram</label>
    <textarea
      id="prompt"
      bind:value={prompt}
      class="textarea textarea-bordered h-24 w-full"
      placeholder="Describe the diagram you want to create in natural language..."
    ></textarea>
    <button
      class="btn btn-primary w-full"
      on:click={generateDiagram}
      disabled={!prompt || isGenerating}
    >
      {#if isGenerating}
        <span class="loading loading-spinner"></span>
      {:else}
        Generate Diagram
      {/if}
    </button>
  </div>

  {#if generatedCode}
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium">Generated Mermaid Code</label>
        <button
          class="btn btn-ghost btn-sm"
          on:click={copyToClipboard}
          title="Copy to clipboard"
        >
          <i class="fas fa-copy"></i>
        </button>
      </div>
      <textarea
        class="textarea textarea-bordered h-48 w-full font-mono"
        readonly
        value={generatedCode}
      ></textarea>
      <button
        class="btn btn-secondary w-full"
        on:click={syncDiagram}
      >
        Preview
      </button>
    </div>
  {/if}
</div> 