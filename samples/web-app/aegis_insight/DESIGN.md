# Design System Strategy: The Sentinel Intelligence Framework

## 1. Overview & Creative North Star: "The Digital Curator"
This design system moves away from the cluttered "mission control" tropes of the past decade. Our Creative North Star is **The Digital Curator**. In an enterprise surveillance environment, data is overwhelming; the UI must act as a high-end filter that brings clarity through sophisticated breathing room and authoritative editorial hierarchy.

We break the "template" look by eschewing rigid 1px containment. Instead, we use **intentional asymmetry** and **tonal layering**. Elements don't just sit on a grid; they are curated on a canvas. By leveraging high-contrast typography scales (the tension between the technical *Inter* and the architectural *Manrope*), we create an experience that feels like a premium intelligence briefing rather than a generic software dashboard.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
The palette is anchored in power and precision. We utilize a light-mode foundation to ensure maximum readability during long-duration cognitive tasks.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. Boundaries must be defined solely through background color shifts. Use `surface-container-low` sections sitting on a `surface` background to define regions. The absence of lines reduces cognitive noise and creates a seamless, "infinite" feel.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper.
*   **Base Layer:** `surface` (#F8F9FA)
*   **Secondary Content Areas:** `surface-container-low` (#F3F4F5)
*   **Active/Interactive Cards:** `surface-container-lowest` (#FFFFFF) to provide a "pop" against the gray base.
*   **Global Navigation:** `primary` (#051125) for high-contrast authority.

### The "Glass & Gradient" Rule
To prevent a flat, "out-of-the-box" look, floating elements (modals, tooltips, hover-cards) must use **Glassmorphism**.
*   **Token Application:** Use semi-transparent `surface_container_lowest` with a 12px-20px `backdrop-blur`.
*   **Signature Textures:** Main Action CTAs should use a subtle linear gradient from `primary` (#051125) to `primary_container` (#1B263B) at a 135-degree angle. This adds a "weighted" feel that flat hex codes cannot achieve.

---

## 3. Typography: The Editorial Authority
We use a dual-typeface system to balance technical precision with executive sophistication.

*   **Display & Headlines (Manrope):** Chosen for its geometric, architectural quality. Used for high-level data points and section titles.
    *   *Display-LG (3.5rem):* Reserved for critical KPIs (e.g., total active threats).
    *   *Headline-SM (1.5rem):* Standard for module titles.
*   **Body & Labels (Inter):** A workhorse for legibility in data-dense tables and logs.
    *   *Body-MD (0.875rem):* Primary reading size for intelligence reports.
    *   *Label-SM (0.6875rem):* Used for metadata and timestamps, always in `on_surface_variant` (#45474D) for secondary hierarchy.

---

## 4. Elevation & Depth: Tonal Layering
In this design system, shadows are an exception, not a rule. Hierarchy is achieved through the **Layering Principle**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural lift without the "dirtiness" of a drop shadow.
*   **Ambient Shadows:** For elevated elements like popovers, use a shadow with a 40px blur and 4% opacity. The shadow color must be tinted with `primary` (Navy), not black, to ensure it feels integrated into the environment.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` token at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components: Precision Primitives

### Buttons
*   **Primary:** Gradient (`primary` to `primary_container`), white text, `md` (0.375rem) corner radius.
*   **Secondary:** Ghost style. `outline_variant` at 20% with `on_secondary_container` text.
*   **Tertiary:** Text-only with `primary` color, used for low-priority actions to avoid visual clutter.

### Input Fields
*   **Visual Style:** Forgo the four-sided box. Use a `surface_container` background with a 2px bottom-stroke of `primary` only when focused. This mimics high-end technical drafting tools.

### Intelligence Chips
*   **Functional Indicators:** Use `error` (#BA1A1A), `success` (#2A9D8F), and `tertiary` (Yellow/Gold) for status. These should be high-saturation but small in scale, acting as "beacons" in the neutral layout.

### Data Lists & Cards
*   **Constraint:** **Forbid divider lines.** Separate list items using 8px or 12px of vertical white space.
*   **Interaction:** On hover, change the background color from `surface` to `surface_container_high`.

### Special Intelligence Components
*   **The "Threat Feed" Card:** Uses a `primary_container` sidebar (4px wide) on the left of the card to denote priority, rather than coloring the whole card.
*   **Map HUD:** Floating glass elements using `surface_container_lowest` with 30% opacity and high blur for over-map controls.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetric Margins:** Give more space to the left of a header than the right to create an editorial, "offset" feel.
*   **Embrace the Gray:** Use the subtle shifts between `#F8F9FA` and `#EDEEEF` to define hierarchy.
*   **Prioritize Typography Scale:** If a section feels "off," try increasing the contrast between the Headline and Body size rather than adding a border or shadow.

### Don't:
*   **Don't use "System Blue" or Pure Black:** Stick strictly to the Navy and Steel Blue tones to maintain the "Intelligence" persona.
*   **Don't use Default Shadows:** Avoid anything that looks like a standard CSS drop-shadow. If it’s not ambient and diffused, remove it.
*   **Don't Over-Color:** Keep 90% of the UI neutral. Use your Alert Yellow and Danger Red only for data that requires immediate human intervention.