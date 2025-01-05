<script lang="ts">
  import { updateCodeStore } from '$lib/util/state';
  import { syncDiagram } from '$lib/util/util';
  import mermaid from 'mermaid';
  
  let prompt = '';
  let generatedCode = '';
  let isGenerating = false;
  let error = '';
  let syntaxError = '';
  let showCopyHint = false;
  let copyHintTimeout: number;

  async function validateMermaidSyntax(code: string): Promise<boolean> {
    try {
      await mermaid.parse(code);
      syntaxError = '';
      return true;
    } catch (err) {
      syntaxError = err.message || 'Invalid Mermaid syntax. Please check your diagram code.';
      return false;
    }
  }

  async function generateDiagram() {
    isGenerating = true;
    error = '';
    syntaxError = '';
    
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
      
      // Validate syntax before updating preview
      const isValid = await validateMermaidSyntax(generatedCode);
      if (isValid) {
        updateCodeStore({ code: generatedCode });
        await syncDiagram();
      }
    } catch (error_) {
      console.error('Error generating diagram:', error_);
      error = error_.message || 'Failed to generate diagram. Please try again.';
    } finally {
      isGenerating = false;
    }
  }

  async function handleCodeChange(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    generatedCode = textarea.value;
    
    // Validate syntax on each change
    const isValid = await validateMermaidSyntax(generatedCode);
    if (isValid) {
      updateCodeStore({ code: generatedCode });
      await syncDiagram();
    }
  }

  async function handlePreview() {
    syntaxError = '';
    const isValid = await validateMermaidSyntax(generatedCode);
    if (isValid) {
      await syncDiagram();
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(generatedCode);
  }

  function saveToLocal() {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mermaid-diagram.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  let downloadBtnClicked = false;
  let copyBtnClicked = false;

  function handleDownload() {
    saveToLocal();
    downloadBtnClicked = true;
    setTimeout(() => downloadBtnClicked = false, 300);
  }

  function handleCopy() {
    copyToClipboard();
    copyBtnClicked = true;
    
    // Clear any existing timeout
    if (copyHintTimeout) {
      clearTimeout(copyHintTimeout);
    }
    
    // Show the hint
    showCopyHint = true;
    
    // Hide after 2 seconds
    copyHintTimeout = window.setTimeout(() => {
      showCopyHint = false;
    }, 2000);
    
    setTimeout(() => copyBtnClicked = false, 300);
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

  .icon-btn {
    position: relative;
    transition: transform 0.2s ease;
  }

  .icon-btn:hover {
    transform: scale(1.1);
  }

  .icon-btn i {
    font-size: 1.1em;
  }

  .download-btn {
    background: linear-gradient(135deg, #06b6d4, #3b82f6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .copy-btn {
    background: linear-gradient(135deg, #8b5cf6, #d946ef);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .icon-btn::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 0.5rem;
    background: currentColor;
    opacity: 0.1;
    top: 0;
    left: 0;
    transition: opacity 0.2s ease;
  }

  .icon-btn:hover::after {
    opacity: 0.2;
  }

  @keyframes pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }

  .icon-btn.clicked {
    animation: pop 0.3s ease;
  }

  .copy-hint {
    position: absolute;
    top: -40px;
    right: 0;
    background: linear-gradient(135deg, #8b5cf6, #d946ef);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s ease;
    pointer-events: none;
    white-space: nowrap;
  }

  .copy-hint.show {
    opacity: 1;
    transform: translateY(0);
  }

  .copy-hint::after {
    content: '';
    position: absolute;
    bottom: -5px;
    right: 20px;
    width: 10px;
    height: 10px;
    background: inherit;
    transform: rotate(45deg);
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
        <div class="flex gap-2 relative">
          <button
            class="btn btn-ghost btn-sm icon-btn download-btn {downloadBtnClicked ? 'clicked' : ''}"
            on:click={handleDownload}
            title="Save to local file"
            aria-label="Save diagram to local file"
          >
            <i class="fas fa-cloud-download-alt"></i>
          </button>
          <div class="relative">
            <div class="copy-hint {showCopyHint ? 'show' : ''}">
              <i class="fas fa-check mr-1"></i>
              Copied to clipboard!
            </div>
            <button
              class="btn btn-ghost btn-sm icon-btn copy-btn {copyBtnClicked ? 'clicked' : ''}"
              on:click={handleCopy}
              title="Copy to clipboard"
              aria-label="Copy generated code to clipboard"
            >
              <i class="fas fa-clipboard-check"></i>
            </button>
          </div>
        </div>
      </div>
      <textarea
        id="generated-code"
        class="textarea textarea-bordered h-48 w-full font-mono {syntaxError ? 'textarea-error' : ''}"
        value={generatedCode}
        on:input={handleCodeChange}
        placeholder="Generated Mermaid code will appear here. You can edit it if needed."
      ></textarea>
      {#if syntaxError}
        <div class="text-error text-sm">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          Syntax Error: {syntaxError}
          <div class="mt-1 text-xs">
            Please modify the code to fix the syntax error. The diagram will update automatically when the syntax is valid.
          </div>
        </div>
      {/if}
      <button
        class="btn btn-secondary w-full"
        on:click={handlePreview}
        disabled={!!syntaxError}
      >
        Preview
      </button>
    </div>
  {/if}
</div> 