<script lang="ts">
  import { stateStore } from '$lib/util/state';
  import Card from './Card/Card.svelte';
  import { logEvent } from '$lib/util/stats';
  import { env } from '$lib/util/env';
  import mermaid from 'mermaid';
  import { onMount } from 'svelte';

  let userInput = $state('');
  let generatedCode = $state('');
  let isGenerating = $state(false);
  let error = $state('');
  let retryCount = $state(0);
  
  const funnyMessages = [
    "Oops! I burned the toast. Let me try again...",
    "That diagram looked like my first attempt at origami. One more time...",
    "Even fish sometimes swim in the wrong direction. Redirecting..."
  ];

  onMount(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default'
    });
  });

  async function validateMermaidSyntax(code: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Clean the code first
      const cleanCode = code.trim().replace(/^\s*[\r\n]/gm, '');
      
      // Try parsing with Mermaid
      const { svg } = await mermaid.render('validate-diagram', cleanCode);
      return { isValid: !!svg, error: undefined };
    } catch (err) {
      console.error('Mermaid validation error:', err);
      return { 
        isValid: false, 
        error: err.str || err.message || 'Invalid Mermaid syntax'
      };
    }
  }

  async function regenerateWithError(originalPrompt: string, syntaxError: string) {
    const response = await fetch(env.cloudflareWorkerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.cloudflareApiToken}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are a Mermaid diagram expert. Fix the following syntax error and regenerate the diagram code. 
                     Common fixes include:
                     - Ensure arrows use proper syntax (-->, -.->, ==>)
                     - Add proper direction indicators (TB, LR, etc.) in flowcharts
                     - Use valid node shapes ([], (), {})
                     - Properly escape special characters
                     - Add missing spaces between elements
                     Only respond with the corrected Mermaid code, no explanations.`
          },
          {
            role: 'user',
            content: `Error: ${syntaxError}\nOriginal request: ${originalPrompt}\nPlease fix and provide valid Mermaid syntax.`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to regenerate diagram');
    }

    const data = await response.json();
    return data.result.response.trim();
  }

  async function generateDiagram() {
    if (!userInput.trim()) {
      error = 'Please enter a description';
      return;
    }

    isGenerating = true;
    error = '';
    retryCount = 0;

    try {
      let currentCode = '';
      let isValid = false;

      while (!isValid && retryCount < 3) {
        // Generate or regenerate code
        const response = await fetch(env.cloudflareWorkerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.cloudflareApiToken}`
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: `You are a Mermaid diagram expert. Generate valid diagram code following these rules:
                         - Always start with a diagram type (flowchart, sequenceDiagram, etc.)
                         - Include direction for flowcharts (TB, LR, etc.)
                         - Use proper arrow syntax (-->, -.->, ==>)
                         - Add spaces between elements
                         - Use valid node shapes
                         Only respond with the Mermaid code, no explanations.`
              },
              {
                role: 'user',
                content: `Generate a Mermaid diagram for: ${userInput}`
              }
            ]
          })
        });

        if (!response.ok) {
          throw new Error('Failed to generate diagram');
        }

        const data = await response.json();
        currentCode = data.result.response.trim();

        // Validate the generated code
        const validation = await validateMermaidSyntax(currentCode);
        
        if (validation.isValid) {
          isValid = true;
          generatedCode = currentCode;
          if (retryCount > 0) {
            error = "Finally got it right! Here's your diagram.";
          }
        } else {
          retryCount++;
          if (retryCount < 3) {
            error = funnyMessages[retryCount - 1];
            // Wait a moment before retrying to show the message
            await new Promise(resolve => setTimeout(resolve, 1500));
            currentCode = await regenerateWithError(userInput, validation.error || 'Unknown syntax error');
          } else {
            error = "I've tried my best, but you might need to tweak the code manually. Here's my last attempt!";
            generatedCode = currentCode;
          }
        }
      }

      // Update the code in the editor
      stateStore.update(state => ({
        ...state,
        code: generatedCode,
        updateDiagram: true
      }));

      logEvent('generateDiagram', {
        success: isValid,
        retries: retryCount
      });
    } catch (err) {
      error = err.message || 'Failed to generate diagram';
      logEvent('generateDiagram', {
        success: false,
        error: error
      });
    } finally {
      isGenerating = false;
    }
  }

  function copyToEditor() {
    if (generatedCode) {
      stateStore.update(state => ({
        ...state,
        code: generatedCode,
        updateDiagram: true
      }));
      logEvent('copyToEditor');
    }
  }
</script>

<div class="flex flex-col gap-4 p-4">
  <Card title="AI Diagram Generator" isOpen={true}>
    <div class="flex flex-col gap-4 p-4">
      <div class="flex flex-col gap-2">
        <label for="diagram-description" class="text-sm font-medium">
          Describe your diagram
        </label>
        <textarea
          id="diagram-description"
          class="textarea textarea-bordered h-24 w-full"
          placeholder="Describe the diagram you want to create (e.g., 'Create a flowchart showing user login process')"
          bind:value={userInput}
        ></textarea>
      </div>

      <div class="flex gap-2">
        <button
          class="btn btn-primary flex-grow"
          on:click={generateDiagram}
          disabled={isGenerating}>
          {#if isGenerating}
            <span class="loading loading-spinner"></span>
            {retryCount > 0 ? 'Regenerating...' : 'Generating...'}
          {:else}
            Generate Diagram
          {/if}
        </button>
      </div>

      {#if error}
        <div class="alert {retryCount === 3 ? 'alert-warning' : retryCount > 0 ? 'alert-info' : 'alert-error'} flex items-center">
          <i class="{retryCount === 3 ? 'fas fa-exclamation-triangle' : retryCount > 0 ? 'fas fa-info-circle' : 'fas fa-times-circle'} mr-2"></i>
          <span>{error}</span>
        </div>
      {/if}

      {#if generatedCode}
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">Generated Mermaid Code</label>
          <div class="relative">
            <textarea
              class="textarea textarea-bordered h-48 w-full font-mono"
              readonly
              value={generatedCode}
            ></textarea>
            <button
              class="btn btn-sm btn-circle absolute right-2 top-2"
              on:click={copyToEditor}
              title="Copy to editor">
              <i class="fas fa-code"></i>
            </button>
          </div>
        </div>
      {/if}
    </div>
  </Card>
</div>

<style>
  .textarea {
    @apply bg-base-200;
  }
  
  :global(.loading) {
    @apply mr-2;
  }
</style> 