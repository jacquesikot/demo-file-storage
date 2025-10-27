# shadcn/ui Setup Documentation

This document describes the shadcn/ui setup for this project.

## ✅ What Was Done

### 1. Path Aliases Configuration

**vite.config.ts**
- Converted from `.js` to `.ts`
- Added path alias `@` pointing to `./src`

**tsconfig.json**
- Added `baseUrl: "."`
- Added path mapping: `"@/*": ["./src/*"]`

### 2. Tailwind CSS Configuration

**tailwind.config.ts**
- Converted from `.js` to `.ts` for better type safety
- Added shadcn/ui CSS variables system
- Configured dark mode support
- Added required plugins: `tailwindcss-animate` and `@tailwindcss/typography`
- Configured custom color tokens using HSL variables

**src/index.css**
- Added CSS custom properties for light and dark themes
- Configured all shadcn/ui color tokens
- Set up proper border and radius variables

### 3. Components Configuration

**components.json**
Created shadcn/ui configuration file:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### 4. Installed Dependencies

**Production Dependencies:**
- `@radix-ui/react-dialog`
- `@radix-ui/react-label`
- `@radix-ui/react-select`
- `@radix-ui/react-slot`
- `@radix-ui/react-tabs`

**Dev Dependencies:**
- `tailwindcss-animate`

### 5. Added shadcn/ui Components

Using `npx shadcn@latest add <component> --yes`:
- ✅ button
- ✅ card
- ✅ dialog
- ✅ tabs
- ✅ input
- ✅ label
- ✅ textarea
- ✅ badge
- ✅ select

All components are located in `src/components/ui/`

### 6. Utility Functions

**src/lib/utils.ts**
Created utility function for merging Tailwind classes:
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 7. Fixed Component Imports

Updated all existing components to use the new shadcn/ui components:
- **BrandDataTab.tsx**: Fixed Dialog imports, removed `DialogBody` and `DialogClose`
- **BriefTab.tsx**: Fixed Dialog imports, updated modal structure
- **DraftTab.tsx**: Fixed Dialog imports, updated modal structure

## 📦 Component Usage

### Importing Components

```typescript
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
```

### Example Usage

**Button:**
```tsx
<Button variant="default" size="lg">
  Click me
</Button>

<Button variant="outline">
  Secondary
</Button>

<Button variant="destructive" size="sm">
  Delete
</Button>
```

**Card:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>
```

**Dialog:**
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    <div className="mt-4">
      {/* Dialog body content */}
    </div>
  </DialogContent>
</Dialog>
```

## 🎨 Customization

### Colors

All colors use CSS custom properties. To customize:

1. Edit `src/index.css`
2. Modify the HSL values in the `:root` selector
3. Colors automatically work in dark mode via `.dark` class

### Adding New Components

```bash
npx shadcn@latest add <component-name>
```

This will:
- Install required dependencies
- Add the component to `src/components/ui/`
- Use the configuration from `components.json`

## ✅ Verification

- ✅ Build passes: `npm run build`
- ✅ Lint passes: `npm run lint`
- ✅ All imports use `@/` alias
- ✅ TypeScript types working correctly
- ✅ No console errors

## 📝 Notes

- The old `DialogBody` component doesn't exist in shadcn/ui. Content goes directly in `DialogContent`.
- The `DialogClose` button is automatically included in `DialogContent` (X button in top right).
- All components support className prop for custom styling.
- Components use Tailwind's CSS variables for theming.

## 🔧 Troubleshooting

**Import errors:**
- Make sure path aliases are configured in both `vite.config.ts` and `tsconfig.json`
- Restart your IDE/editor after configuration changes

**Style not applying:**
- Check that `src/index.css` is imported in `src/main.tsx`
- Verify Tailwind config includes all source files in `content` array

**Component not found:**
- Run `npx shadcn@latest add <component-name>` to install it
- Check that `components.json` is properly configured

## 📚 Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Tailwind CSS](https://tailwindcss.com)
