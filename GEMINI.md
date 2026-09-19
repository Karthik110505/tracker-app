# Premium UI and Frontend Development Guidelines

To ensure all websites and user interfaces built or updated in this repository look engaging, modern, and premium, follow these strict guidelines. Do not write generic or basic "vibe code" (i.e., plain un-styled HTML/CSS or basic template layouts). Instead, build immersive, high-quality user experiences.

---

## 🎨 Core Design Resources

Whenever building or upgrading components or pages, reference or mimic these design patterns and assets:

1. **SVG Assets & Backgrounds (Haikei - [haikei.app](https://haikei.app/))**
   - Use beautiful SVG assets like layered waves, custom blobs, smooth gradients, grids, and low-poly patterns.
   - Implement SVG backgrounds to divide sections and add depth to landing pages or dashboard modules.

2. **Component Libraries (Watermelon UI - [ui.watermelon.sh](https://ui.watermelon.sh/))**
   - Utilize a registry-style, copy-paste component architecture (using Radix UI, Framer Motion, and Tailwind CSS).
   - Design clean, responsive cards, dashboards, login pages, and controls with consistent spacing, subtle borders, and a polished dark/light mode presence.
   - Leverage these core UI component libraries:
     - **shadcn/ui** ([ui.shadcn.com](https://ui.shadcn.com/)) for standard-compliant, accessible, and themeable components.
     - **Kokonut UI** ([kokonutui.com](https://kokonutui.com/)) for modern Next.js/React and Tailwind CSS components with premium aesthetics.
     - **Bklit UI** ([bklit.com](https://bklit.com/)) for highly customizable, composable charts and visual data representation.

3. **Motion & Animations (Motion Primitives - [motion-primitives.com](https://www.motion-primitives.com/))**
   - Apply highly polished, copy-pasteable Framer Motion components.
   - Include premium animations such as text scrambling/morphing, scroll-triggered entries, animated accordion/popover transitions, and spring-physics-based hover effects.
   - Incorporate other premium motion and animation libraries:
     - **Motion** ([motion.dev](https://motion.dev/)) for UI animations, gestures, and scroll animations.
     - **Anime.js** ([animejs.com](https://animejs.com/)) for complex timelines, SVG path morphing, and lightweight JS animations.
     - **Magic UI** ([magicui.design](https://magicui.design/))
     - **Aceternity UI** ([ui.aceternity.dev](https://ui.aceternity.dev/))
     - **Animata** ([animata.design](https://animata.design/))

---

## 💡 Engineering & Aesthetic Rules

* **Micro-interactions:** Add subtle, satisfying hover and active states (scale down on tap/click, smooth transitions, spring physics for modals/dialogs).
* **Glassmorphism & Gradients:** Apply backdrop filters (`backdrop-blur`) and layered mesh gradients to make modals and cards stand out.
* **Modern CSS & APIs:** Use OKLCH color spaces for smooth, vibrant colors, container queries for component responsiveness, and native APIs like `<dialog>` and Popovers with `@starting-style` transitions for entry/exit animations.
* **No "Vibe Coding":** Plan layouts beforehand. Choose color palettes, typographic hierarchy, and responsive grids rather than writing quick, ad-hoc inline styles without design consistency.
