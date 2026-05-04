# Matripuntos iconography — quick reference

See the main README's **Iconography** section for full details. This file exists so agents browsing `assets/` have a short crib sheet.

## Task categories (canonical)
🍳 Cocina · 🧹 Limpieza · 🛒 Compras · 👶 Niños · 🐕 Mascotas · 🔧 Reparaciones · 💰 Finanzas · 📋 Otros

## Gamification
🏆 🥇 🥈 🥉 🔥 ⭐ 💎 🎯 📊 ⚖️ 👑 🌟 ❤️ 💑 🏠 ✨ 🎉

## Utility (for non-emoji icons)
Use **Lucide** via React (`lucide-react`) — the live app already uses it: `BarChart3`, `Plus`, `Settings`, `LogOut`, `TrendingUp`, `TrendingDown`, `Loader`, `PieChart`, `Calendar`, `Sun`, `Moon`, `Search`, `X`, `ChevronLeft`, `ChevronRight`, `Bell`.

**CDN equivalent** (if rendering outside React): `<script src="https://unpkg.com/lucide@latest"></script>` then `lucide.createIcons()`.

Stroke weight: 1.5 (Lucide default). Color: inherit from parent text color, typically `#9ca3af` (secondary) or `#e2e8f0` (primary).

## Logo / wordmark

No brand-mark file exists in the codebase yet. Render the name as text:

```html
<span style="font-family: Inter; font-weight: 800; letter-spacing: -0.02em; color: #e2e8f0">
  Matri<span style="color: #f59e0b">puntos</span>
</span>
```

Preview card: `preview/brand-logo.html`.

## Flag

A dedicated wordmark + app-icon asset is **missing** and should be produced in the next brand iteration.
