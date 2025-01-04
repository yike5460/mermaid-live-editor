#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Node version:${NC} $(node -v)"

echo -e "${YELLOW}🔧 Installing build dependencies...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    brew install python3 make gcc
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    sudo apt-get update
    sudo apt-get install -y python3 build-essential
fi

echo -e "${YELLOW}🔧 Setting up Corepack...${NC}"
if ! command -v corepack &> /dev/null; then
    echo -e "${YELLOW}Installing Corepack...${NC}"
    npm install -g corepack
fi

echo -e "${YELLOW}Enabling Corepack...${NC}"
corepack enable

echo -e "${YELLOW}Preparing Yarn...${NC}"
corepack prepare yarn@3.6.3 --activate

echo -e "${YELLOW}📦 Yarn version:${NC} $(yarn -v)"

echo -e "${YELLOW}🧹 Cleaning up...${NC}"
rm -rf node_modules .svelte-kit

# Set environment variables for the build
export PYTHON=python3
export npm_config_build_from_source=true
export NODE_OPTIONS="--max-old-space-size=4096"

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
yarn install --check-cache --inline-builds

echo -e "${YELLOW}🔄 Syncing SvelteKit files...${NC}"
yarn svelte-kit sync

echo -e "${YELLOW}🏗️ Building application...${NC}"
yarn build

echo -e "${YELLOW}🔍 Checking build output...${NC}"
if [ -d ".svelte-kit/cloudflare" ]; then
    echo -e "${GREEN}✅ Build successful! Output directory exists.${NC}"
    ls -la .svelte-kit/cloudflare
else
    echo -e "${RED}❌ Build failed! Output directory missing.${NC}"
    echo -e "${YELLOW}💡 Checking for error logs...${NC}"
    if [ -f ".svelte-kit/build.log" ]; then
        cat .svelte-kit/build.log
    fi
    exit 1
fi

echo -e "${YELLOW}🚀 Starting local development server...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
yarn pages:dev 