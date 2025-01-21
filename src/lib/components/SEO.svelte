<!-- SEO.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  export let title = 'Mermaid Guru - Online Diagram Editor';
  export let description =
    'A simple and powerful online diagram editor for creating flowcharts, sequence diagrams, and more using Mermaid syntax.';
  export let path = '';
  export let image = '/favicon.png';

  let url: string;

  onMount(() => {
    url = `https://mermaid.guru${path}`;
  });

  // JSON-LD structured data
  $: structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: title,
    description: description,
    url: url,
    image: image,
    applicationCategory: 'DiagramEditor',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    }
  };
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />

  <!-- Dynamic Open Graph -->
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  {#if url}
    <meta property="og:url" content={url} />
    <link rel="canonical" href={url} />
  {/if}

  <!-- Dynamic Twitter -->
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />

  <!-- JSON-LD -->
  <script type="application/ld+json">
    {JSON.stringify(structuredData)}
  </script>
</svelte:head>
