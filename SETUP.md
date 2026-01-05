# Excaligraph - Setup Guide

## 🎯 Project Principles

This project follows **feature-based architecture** with **Scope Rule** and **Screaming Architecture**:

- **Domain organization**: Features, not file types
- **Scope Rule**: Code used by 2+ features → `shared/`, code for 1 feature → local
- **No semicolons**: Biome configured with `semicolons: "asNeeded"`
- **Strict TypeScript**: `any` forbidden, explicit typing always

## Installed Tools

### 🎨 Biome (Replaces ESLint + Prettier)
All-in-one fast formatter and linter for JavaScript/TypeScript.

**Configuration:**
- No semicolons (`;`)
- Double quotes (`"`)
- Trailing commas ES5
- Strict mode enabled

**Scripts:**
- `pnpm lint` - Run linter
- `pnpm lint:fix` - Fix linting issues
- `pnpm format` - Check formatting
- `pnpm format:fix` - Fix formatting issues
- `pnpm check` - Run both linter and formatter checks
- `pnpm check:fix` - Fix both linting and formatting issues (recommended)

### 🎨 Tailwind CSS v4
Utility-first CSS framework configured with the latest Vite plugin.

**Features:**
- CSS variables for theming
- Dark mode support
- Configured in `src/index.css`

### 🧩 shadcn/ui
Beautiful, accessible UI components built with Radix UI and Tailwind CSS.

**Configuration:**
- Style: New York
- Base color: Neutral
- CSS variables: Enabled
- Icon library: Lucide React

**Adding Components:**
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
# ... etc
```

**Available utilities:**
- `cn()` utility function in `src/lib/utils.ts` for merging class names

## Path Aliases

The project is configured with path aliases:
- `@/*` → `./src/*`

Example:
```typescript
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure (Feature-Based Architecture)

Based on **Scope Rule** and **Screaming Architecture** from README:

```
excaligraph/
├── src/
│   ├── features/              # Domain organization (NOT by type)
│   │   └── [feature-name]/
│   │       ├── [feature-name].tsx    # Main container
│   │       ├── components/           # Feature-specific components
│   │       ├── hooks/                # Feature-specific hooks
│   │       ├── services/             # Feature business logic
│   │       └── types.ts              # Feature-specific types
│   │
│   ├── shared/                # ONLY code used by 2+ features
│   │   ├── components/        # Shared components
│   │   │   └── ui/           # shadcn/ui components
│   │   ├── hooks/            # Shared hooks
│   │   ├── lib/              # Shared utilities
│   │   │   └── utils.ts      # cn() helper
│   │   ├── types/            # Global types
│   │   └── interfaces/       # IGraphRepository, ICanvasAdapter
│   │
│   ├── adapters/             # Interface implementations
│   │   ├── LocalStorageRepository.ts
│   │   └── ExcalidrawAdapter.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css             # Tailwind CSS + theme variables
│
├── biome.json                # Biome configuration
├── components.json           # shadcn/ui configuration
├── vite.config.ts            # Vite configuration
└── package.json
```

### 📏 Code Limits

- **Components**: Maximum 200 lines
- **Custom hooks**: Maximum 150 lines
- **Utils/helpers**: Maximum 100 lines
- **Constants**: Maximum 50 lines

If you exceed these limits, **split into smaller modules**.

## Next Steps

1. Add shadcn/ui components as needed:
   ```bash
   npx shadcn@latest add [component-name]
   ```

2. Start building your UI with Tailwind CSS classes

3. Use Biome for consistent code formatting:
   ```bash
   pnpm check:fix
   ```

4. Explore the [shadcn/ui documentation](https://ui.shadcn.com) for available components
