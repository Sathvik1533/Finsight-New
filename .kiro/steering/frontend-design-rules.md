---
inclusion: fileMatch
fileMatchPattern: "src/**/*.tsx"
---

# Frontend Design Rules for FinSight

## Auto-Applied When Working on Frontend Files

### Design System Reference
Before creating or modifying any UI component, reference:
- `design-system/README.md` for colors, typography, spacing
- Existing components in `src/components/` for patterns
- Dashboard page for layout structure

### Component Standards

**All Components Must:**
1. Use Tailwind CSS classes (no inline styles)
2. Support dark mode (slate-900 base)
3. Include Framer Motion animations where appropriate
4. Be responsive (mobile-first)
5. Use TypeScript with proper types

**Color Palette:**
- Background: `bg-slate-900`, `bg-slate-950`
- Primary: `bg-amber-400`, `text-amber-400`
- Text: `text-white`, `text-white/60`, `text-white/80`
- Borders: `border-white/8`, `border-white/10`
- Glass: `bg-white/4`, `backdrop-blur-sm`

**Spacing:**
- Container: `max-w-7xl mx-auto px-4 md:px-8`
- Gaps: `gap-4`, `gap-6`, `gap-8`
- Padding: `p-4`, `p-6`, `p-8`

**Typography:**
- Headings: `text-3xl font-bold text-white`
- Body: `text-sm text-white/60`
- Labels: `text-xs text-white/50`

**Animations:**
```typescript
// Standard fade-in
initial={{ opacity: 0, y: -20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5 }}

// Hover scale
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

### Component Patterns

**KPI Card:**
- Glass morphism: `bg-white/4 backdrop-blur-sm`
- Border: `border border-white/8`
- Rounded: `rounded-xl`
- Padding: `p-6`
- Icon + Label + Value layout

**Modal:**
- Overlay: `bg-black/50 backdrop-blur-sm`
- Content: `bg-slate-900 border border-white/10`
- Close button: Top-right with X icon
- Animations: Fade + scale

**Button:**
- Primary: `bg-amber-400 text-black hover:bg-amber-300`
- Secondary: `border border-white/20 text-white hover:bg-white/5`
- Rounded: `rounded-lg`
- Padding: `px-6 py-3`

### Accessibility
- All interactive elements must have focus states
- Use semantic HTML (button, nav, main, etc.)
- Include aria-labels for icons
- Ensure color contrast meets WCAG AA

### Performance
- Use `next/image` for images
- Lazy load heavy components
- Minimize bundle size (tree-shake unused code)
- Use React.memo for expensive components

### File Structure
```
src/components/
├── dashboard/          # Dashboard-specific components
├── upload/             # Upload-related components
└── ui/                 # Reusable UI primitives
```

### When Creating New Components:
1. Check if similar component exists
2. Follow existing naming conventions
3. Add TypeScript types
4. Include JSDoc comments
5. Test responsive behavior
6. Add to component index if reusable

### Design Inspiration Sources:
- Linear.app (clean, minimal)
- Vercel Dashboard (dark mode, glass)
- Stripe Dashboard (data visualization)
- Notion (progressive disclosure)
