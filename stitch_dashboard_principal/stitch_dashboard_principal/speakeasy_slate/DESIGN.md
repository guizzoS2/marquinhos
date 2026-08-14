# Design System Specification: High-End Editorial for Hospitality SaaS

## 1. Overview & Creative North Star: "The Fluid Concierge"

The bar management industry is chaotic, loud, and high-pressure. This design system seeks to be the antithesis of that environment: a calm, digital sanctuary. Our Creative North Star is **"The Fluid Concierge."** 

Unlike generic SaaS templates that rely on rigid grids and harsh borders, this system uses **Soft Minimalism** and **Editorial Hierarchy** to guide the user. We break the "boxed-in" feel through intentional white space and "Organic Asymmetry"—where content flows naturally across the screen, mimicking the premium feel of a high-end cocktail menu or a boutique hotel directory. The experience must feel "light as air" yet authoritative, using sophisticated layering to ensure non-technical users never feel overwhelmed.

---

## 2. Colors: Tonal Depth & Signature Accents

Our palette moves away from "flat" design toward "tonal" design. We use the interplay of whites and cool grays to create a sense of physical space.

### The "No-Line" Rule
**Borders are strictly prohibited for sectioning.** To separate a sidebar from a main feed, or a header from a body, do not use a 1px line. Instead, use a background shift (e.g., `surface` transitioning to `surface-container-low`). This creates a cleaner, more premium aesthetic that reduces visual noise.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, fine-paper sheets. 
- **Base Layer:** `surface` (#f5f6f7) for the global background.
- **Section Layer:** `surface-container-low` (#eff1f2) for large content areas.
- **Component Layer:** `surface-container-lowest` (#ffffff) for the most prominent cards or "active" work surfaces.

### The "Glass & Gradient" Rule
To elevate the "professional blue" (`primary`: #0058bb), never use it solely as a flat block. 
- **Signature Textures:** Apply a subtle linear gradient from `primary` to `primary_container` (#6c9fff) for hero buttons and key metrics. This adds "soul" and depth.
- **Glassmorphism:** For floating navigation or modal overlays, use `surface` at 80% opacity with a `backdrop-filter: blur(12px)`.

---

## 3. Typography: The Editorial Voice

We pair two sans-serifs to create a sophisticated, highly readable hierarchy. **Manrope** provides a geometric, modern flair for high-level information, while **Inter** handles the heavy lifting of data and labels.

*   **Display & Headlines (Manrope):** These are the "Voices" of the app. Use `display-lg` (3.5rem) for dashboard welcomes or empty states. The generous tracking and weight of Manrope convey a sense of calm authority.
*   **Titles & Body (Inter):** Inter is chosen for its exceptional legibility in low-light bar environments. `body-md` (0.875rem) is our workhorse. 
*   **The Intentional Scale:** We use high contrast between `headline-lg` and `label-sm`. This dramatic shift in scale allows a manager to squint and see high-level sales numbers from across a room while keeping secondary details tucked away neatly.

---

## 4. Elevation & Depth: Tonal Layering

We convey importance through light and physics, not lines.

*   **The Layering Principle:** Achieve depth by "nesting." A `surface-container-lowest` (#ffffff) card sitting on a `surface-container-low` (#eff1f2) background creates a natural lift.
*   **Ambient Shadows:** If a card must "float" (e.g., a dropdown or a high-priority alert), use an extra-diffused shadow: `box-shadow: 0 12px 40px rgba(44, 47, 48, 0.06)`. Note the use of `on_surface` (#2c2f30) as the shadow tint rather than pure black—this mimics natural, ambient light.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility in input fields, use `outline_variant` at **20% opacity**. Never use a 100% opaque border; it breaks the "Fluid Concierge" illusion.

---

## 5. Components: Softness & Intent

All components utilize the **Roundedness Scale**, primarily `DEFAULT` (8px) for small elements and `lg` (16px) for containers to maintain a "friendly" and "approachable" touch.

### Buttons & Chips
*   **Primary Button:** Gradient from `primary` to `primary_container`. Rounding: `md` (12px).
*   **Chips:** Used for "Table Status" or "Inventory Categories." Use `secondary_container` (#5ffbd6) with `on_secondary_container` text. Keep them pill-shaped (`full`) for a distinct visual identity from buttons.

### Cards & Lists
*   **Forbid Dividers:** Do not use `hr` tags. Use `spacing-6` (1.5rem) to separate list items or use alternating background shifts (`surface` to `surface_container_low`). 
*   **Inventory Cards:** Use `surface-container-lowest` with a `lg` corner radius. Group related items using whitespace rather than containers-within-containers.

### Form Inputs
*   **The Focus State:** When an input is active, do not just change the border color. Use a subtle `primary_container` outer glow (4px blur) to make the field feel "illuminated."

### Contextual Components (Bar Management)
*   **The "Pour Gauge":** A custom progress bar using a gradient of `secondary` (#006855) to track liquor levels, wrapped in a `surface_variant` track.
*   **Status Indicators:** Instead of small dots, use soft "Glow Pulses" using `tertiary_fixed` (#02cbff) for active orders.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** Place high-level metrics off-center or in varied card widths to create an editorial, non-templated look.
*   **Embrace Whitespace:** If a screen feels crowded, increase the spacing to `spacing-12` or `spacing-16`. 
*   **Layer with Purpose:** Only "lift" an element (using shadows) if it requires immediate user action.

### Don’t:
*   **Don't use pure black:** Use `on_surface` (#2c2f30) for all text to keep the vibe "friendly" and readable.
*   **Don't use 1px borders:** Rely on background tonal shifts. If you think you need a border, try a 4px margin first.
*   **Don't crowd the margins:** Bar staff use tablets; ensure touch targets are large and have at least `spacing-4` of "breathing room" around them.