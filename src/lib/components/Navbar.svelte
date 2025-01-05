<script module lang="ts">
  import { logEvent, plausible } from '$lib/util/stats';
  import { version } from 'mermaid/package.json';
  void logEvent('version', {
    mermaidVersion: version
  });
</script>

<script lang="ts">
  import { dismissPromotion, getActivePromotion } from '$lib/util/promos/promo';
  import { themeStore } from '$lib/util/theme';
  import type { ComponentProps } from 'svelte';
  import DropdownNavMenu from './DropdownNavMenu.svelte';
  import Theme from './Theme.svelte';

  let isMenuOpen = $state(false);
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  type Links = ComponentProps<typeof DropdownNavMenu>['links'];

  const githubLinks: Links = [
    { title: 'Repository', href: 'https://github.com/yike5460' }
  ];

  let activePromotion = $state(getActivePromotion());

  const trackBannerClick = () => {
    if (!plausible || !activePromotion) {
      return;
    }
    logEvent('bannerClick', {
      promotion: activePromotion.id
    });
  };
</script>

{#if activePromotion}
  <div
    class="top-bar z-10 flex h-fit w-full items-center justify-center bg-gradient-to-r from-[#bd34fe] to-[#ff3670] p-1 text-center text-white">
    <div
      class="flex flex-grow"
      role="button"
      tabindex="0"
      onclick={trackBannerClick}
      onkeypress={trackBannerClick}
      aria-label="Promotion banner">
      <activePromotion.component />
    </div>
    <button
      class="rounded hover:text-black"
      title="Dismiss banner"
      aria-label="Dismiss banner"
      onclick={() => {
        dismissPromotion(activePromotion?.id);
        activePromotion = undefined;
      }}>
      <i class="fa fa-close px-2" aria-hidden="true"></i>
    </button>
  </div>
{/if}

<div class="navbar z-50 bg-primary p-0 shadow-lg">
  <div class="mx-2 flex flex-1 gap-2 px-2">
    <a href="/" class="flex items-center" aria-label="Home">
      <div class="swimming-fish">
        <div class="fish-body">
          <div class="fish-back-fin"></div>
          <div class="fish-mouth"></div>
        </div>
      </div>
    </a>
    <div class="flex flex-col">
      <div class="flex items-center justify-center gap-2 font-bold">
        <a href="/" class="text-xl">Mermaid Viz</a>
      </div>
      <div class="text-gradient-animate text-sm font-medium">
        Tool to visualize your Mermaid diagrams
      </div>
    </div>
  </div>

  <label
    for="menu-toggle"
    class={isMenuOpen ? 'hidden' : 'pointer-cursor fixed right-4 z-[1000] lg:hidden'}
    aria-label="Open menu">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      class="fill-current"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true">
      <title>Menu</title>
      <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
    </svg>
  </label>

  <label
    for="menu-toggle"
    class={isMenuOpen ? 'pointer-cursor fixed right-4 z-[1000] lg:hidden' : 'hidden'}
    aria-label="Close menu">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      class="fill-current"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true">
      <title>Cross</title>
      <line x1="5" y1="5" x2="15" y2="15" stroke="white" stroke-width="2" />
      <line x1="5" y1="15" x2="15" y2="5" stroke="white" stroke-width="2" />
    </svg>
  </label>

  <input
    class="hidden"
    type="checkbox"
    id="menu-toggle"
    bind:checked={isMenuOpen}
    onclick={toggleMenu} />

  <div class="hidden w-full lg:flex lg:w-auto lg:items-center" id="menu">
    <ul class="items-center justify-between pt-4 text-base lg:flex lg:pt-0">
      <li>
        <Theme />
      </li>
      <li>
        <DropdownNavMenu icon="fab fa-github fa-lg" links={githubLinks} />
      </li>
    </ul>
  </div>
</div>
<style>
  #menu-toggle:checked + #menu {
    position: absolute;
    top: 2.5rem;
    padding: 1rem 0;
    background: #661ae6;
    display: flex;
  }

  .text-gradient-primary {
    background: linear-gradient(45deg, #4f46e5, #06b6d4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .text-gradient-animate {
    background: linear-gradient(
      45deg,
      #4f46e5 0%,
      #06b6d4 25%,
      #8b5cf6 50%,
      #06b6d4 75%,
      #4f46e5 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient 3s linear infinite;
  }

  @keyframes gradient {
    0% {
      background-position: 0% center;
    }
    100% {
      background-position: 200% center;
    }
  }

  .swimming-fish {
    position: relative;
    width: 1.8rem;
    height: 1.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Fish body container for unified animation */
  .fish-body {
    position: absolute;
    width: 100%;
    height: 100%;
    animation: swim 3s ease-in-out infinite;
  }

  /* Chubby fish body */
  .fish-body::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #4f46e5 20%, #06b6d4 90%);
    border-radius: 65% 35% 35% 65%;
    box-shadow: 0 0 8px rgba(6, 182, 212, 0.2);
  }

  /* Cute tail */
  .swimming-fish::after {
    content: '';
    position: absolute;
    right: -15%;
    width: 35%;
    height: 70%;
    background: linear-gradient(135deg, #4f46e5 20%, #06b6d4 90%);
    border-radius: 40% 50% 50% 40%;
    transform-origin: left center;
    animation: wagTail 3s ease-in-out infinite;
  }

  /* Simple mouth edge */
  .fish-mouth {
    position: absolute;
    width: 5px;
    height: 5px;
    border: 1.5px solid rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    left: 22%;
    top: 45%;
    z-index: 1;
    border-top-color: transparent;
    border-right-color: transparent;
    transform: rotate(-35deg);
  }

  /* Simple wave effect */
  @keyframes swim {
    0%, 100% {
      transform: translateY(0) rotate(-5deg);
    }
    50% {
      transform: translateY(-2px) rotate(0deg);
    }
  }

  @keyframes wagTail {
    0%, 100% {
      transform: rotate(-10deg) scaleX(0.8);
    }
    50% {
      transform: rotate(10deg) scaleX(1);
    }
  }
</style>

