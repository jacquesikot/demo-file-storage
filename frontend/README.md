# Frontend - Claude Workflow Manager

React + TypeScript + Vite application with shadcn/ui components.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Markdown**: React Markdown

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Environment Variables

Create a `.env.local` file for local development:

```env
VITE_API_URL=http://localhost:8000/api
```

For Docker builds, pass the API URL as a build argument:

```bash
docker build --build-arg VITE_API_URL=https://your-backend.com/api -t frontend .
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── ActiveJobsPanel.tsx
│   │   ├── BrandDataTab.tsx
│   │   ├── BriefTab.tsx
│   │   ├── DraftTab.tsx
│   │   ├── JsonViewer.tsx
│   │   ├── LogViewer.tsx
│   │   └── MarkdownViewer.tsx
│   ├── lib/
│   │   └── utils.ts         # Utility functions
│   ├── api.ts               # API client
│   ├── types.ts             # TypeScript types
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles + theme
├── components.json          # shadcn/ui config
├── tailwind.config.ts       # Tailwind configuration
├── vite.config.ts           # Vite configuration
└── tsconfig.json            # TypeScript configuration

```

## shadcn/ui Setup

This project uses [shadcn/ui](https://ui.shadcn.com) for UI components.

### Configuration

- **Path Alias**: `@/` maps to `./src/`
- **Style**: Default
- **Base Color**: Slate
- **CSS Variables**: Enabled
- **Components Location**: `src/components/ui/`

### Installed Components

- button
- card
- dialog
- tabs
- input
- label
- textarea
- badge
- select

### Adding New Components

```bash
npx shadcn@latest add <component-name>
```

Example:
```bash
npx shadcn@latest add dropdown-menu
npx shadcn@latest add toast
```

### Using Components

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello World</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  )
}
```

## Theming

The application uses CSS variables for theming. Colors are defined in `src/index.css`:

- Light mode: `:root` selector
- Dark mode: `.dark` selector

To customize colors, edit the HSL values in `src/index.css`:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  /* ... other colors */
}
```

## API Integration

The API client is configured in `src/api.ts` and uses the `VITE_API_URL` environment variable:

```typescript
// Automatically uses VITE_API_URL or falls back to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## TypeScript Configuration

- **Target**: ES2020
- **Module**: ESNext
- **Path Aliases**: `@/*` → `./src/*`
- **Strict Mode**: Enabled

## Styling Guide

### Using Tailwind Classes

```tsx
<div className="flex items-center gap-4 p-6">
  <Button variant="default" size="lg">
    Primary Action
  </Button>
</div>
```

### Using shadcn/ui Variants

```tsx
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

### Combining Classes with cn()

```tsx
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  "conditional-classes"
)}>
```

## Troubleshooting

### Import Errors

If you see import errors:
1. Restart your IDE/editor
2. Check that `vite.config.ts` has the `@` alias configured
3. Verify `tsconfig.json` includes the path mapping

### Build Errors

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Styling Not Applied

1. Check `src/index.css` is imported in `src/main.tsx`
2. Verify Tailwind config includes your files in the `content` array
3. Restart the dev server

## Resources

- [Vite Documentation](https://vite.dev)
- [React Documentation](https://react.dev)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Radix UI Primitives](https://www.radix-ui.com)
