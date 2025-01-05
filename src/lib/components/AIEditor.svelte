<script lang="ts">
  import { updateCodeStore } from '$lib/util/state';
  import { syncDiagram } from '$lib/util/util';
  
  let prompt = '';
  let generatedCode = '';
  let isGenerating = false;
  let error = '';

  async function generateDiagram() {
    isGenerating = true;
    error = '';
    
    try {
      const systemPrompt = `You are a Mermaid diagram expert. Convert the user's natural language description into a valid Mermaid diagram code.
Follow these rules:
1. Only output valid Mermaid syntax
2. Do not include any explanations or markdown formatting
3. Include all necessary diagram type declarations (e.g. flowchart TD, sequenceDiagram, etc.)
4. Use appropriate Mermaid features like styling, labels, and formatting for clarity
5. Ensure the diagram is readable and well-structured`;

      const response = await fetch('/api/generate-diagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          systemPrompt
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate diagram');
      }

      const result = await response.json();
      generatedCode = result.mermaidCode;
      
      updateCodeStore({ code: generatedCode });
      await syncDiagram();
    } catch (error_) {
      console.error('Error generating diagram:', error_);
      error = error_.message || 'Failed to generate diagram. Please try again.';
    } finally {
      isGenerating = false;
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(generatedCode);
  }
</script>

<style>
  @keyframes swim {
    0% {
      transform: translateX(-3px) rotate(-5deg);
    }
    50% {
      transform: translateX(3px) rotate(5deg);
    }
    100% {
      transform: translateX(-3px) rotate(-5deg);
    }
  }

  .swimming-mermaid {
    animation: swim 1.5s ease-in-out infinite;
    display: inline-block;
  }

  .swimming-mermaid i {
    color: #fff;
    font-size: 1.2em;
  }
</style>

<div class="flex h-full flex-col gap-4 p-4">
  <div class="flex flex-col gap-2">
    <label for="prompt-input" class="text-sm font-medium">Describe your diagram</label>
    <textarea
      id="prompt-input"
      bind:value={prompt}
      class="textarea textarea-bordered h-24 w-full"
      placeholder="Describe the diagram you want to create in natural language. For example: 'Create a flowchart showing the user registration process with email verification'"
    ></textarea>
    <button
      class="btn btn-primary w-full"
      on:click={generateDiagram}
      disabled={!prompt || isGenerating}
    >
      {#if isGenerating}
        <span class="swimming-mermaid">
          <i class="fas fa-fish"></i>
        </span>
        <span class="ml-2">Generating...</span>
      {:else}
        Generate Diagram
      {/if}
    </button>
    {#if error}
      <div class="text-error text-sm mt-2">{error}</div>
    {/if}
  </div>

  {#if generatedCode}
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label for="generated-code" class="text-sm font-medium">Generated Mermaid Code</label>
        <button
          class="btn btn-ghost btn-sm"
          on:click={copyToClipboard}
          title="Copy to clipboard"
          aria-label="Copy generated code to clipboard"
        >
          <i class="fas fa-copy"></i>
        </button>
      </div>
      <textarea
        id="generated-code"
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