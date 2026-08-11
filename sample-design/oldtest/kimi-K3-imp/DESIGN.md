---
name: JulCraft
description: Handmade jewelry workshop — 12 visual concept directions for artisanal accessories
colors:
  editorial-paper: "#f7f4ee"
  editorial-ink: "#1c1a17"
  editorial-accent: "#b3492e"
  editorial-soft: "#8b7f74"
  terracotta-clay: "#c96f4a"
  terracotta-clay-deep: "#a4502f"
  terracotta-cream: "#f4e9dc"
  terracotta-sand: "#e9d8c3"
  terracotta-earth: "#5b4636"
  terracotta-olive: "#7a7a52"
  seaglass-deep: "#0f3d4a"
  seaglass-sea: "#2e7d8a"
  seaglass-foam: "#eaf4f3"
  seaglass-sand: "#e7e3d7"
  seaglass-glass: "#8fc1bd"
  herbarium-green: "#3f5940"
  herbarium-green-deep: "#2c4030"
  herbarium-paper: "#f8f5ec"
  herbarium-moss: "#7d8c6f"
  herbarium-rust: "#a05c3b"
  darklux-gold: "#c8a24e"
  darklux-gold-dim: "#8f7439"
  darklux-bg: "#101013"
  darklux-panel: "#17171c"
  darklux-txt: "#d9d5cc"
  retro70-cream: "#f5edd8"
  retro70-mustard: "#d9a441"
  retro70-rust: "#c05c33"
  retro70-olive: "#6b7a3f"
  retro70-brown: "#4a3226"
  wabisabi-paper: "#f2efe8"
  wabisabi-ink: "#3b3a36"
  wabisabi-stone: "#9a958a"
  wabisabi-aki: "#a3805c"
  sketchbook-paper: "#fdfbf4"
  sketchbook-pencil: "#4a4a4a"
  sketchbook-red: "#c0392b"
  sketchbook-blue: "#3a6ea8"
  artdeco-cream: "#f0e7d3"
  artdeco-gold: "#b28a3e"
  artdeco-ink: "#263f3c"
  artdeco-deep: "#16302d"
  swiss-ink: "#111"
  swiss-bg: "#fff"
  swiss-red: "#e6321e"
  swiss-grey: "#efefef"
  linen-linen: "#f1ece2"
  linen-thread: "#8a7a5e"
  linen-sage: "#9aa48b"
  linen-ink: "#3d372e"
  linen-berry: "#8a5a63"
  memphis-bg: "#faf5ec"
  memphis-ink: "#22242a"
  memphis-c1: "#e8b64c"
  memphis-c2: "#7fae9e"
  memphis-c3: "#d0785a"
typography:
  display:
    fontFamily: "var(--concept-display-font, 'Playfair Display', Georgia, serif)"
    fontSize: "clamp(2.5rem, 11vw, 9.5rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.02em"
  body:
    fontFamily: "var(--concept-body-font, 'Inter', -apple-system, sans-serif)"
    fontSize: "clamp(0.9rem, 1.2vw, 1.1rem)"
    fontWeight: 300
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "var(--concept-body-font, 'Inter', -apple-system, sans-serif)"
    fontSize: "0.72rem"
    fontWeight: 500
    letterSpacing: "0.2em"
    textTransform: "uppercase"
rounded:
  sm: "4px"
  md: "12px"
  lg: "22px"
  pill: "999px"
  arch: "260px 260px 22px 22px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "32px"
  lg: "64px"
  xl: "100px"
  section-padding: "clamp(60px, 9vw, 120px)"
  page-padding: "5vw"
---

# Design System: JulCraft

## Overview

**Creative North Star: "The Artisan's Workshop"**

JulCraft is a modular design system for a handmade jewelry workshop. Rather than a single monolithic visual identity, it offers 12 distinct visual worlds — each a complete, self-contained design concept that explores a different aesthetic direction for the same product truth: handmade jewelry with character, warmth, and story.

The system is built for concept selection: a master jeweler (Юля) and her potential customers browse these visual directions to find the world that best represents the workshop's identity. Each concept is a fully-realized, production-ready HTML page — not a wireframe or moodboard, but a complete design expression.

**Key Characteristics:**
- Modular architecture: 12 independent visual worlds, each self-contained
- Warm, handmade character across all directions — never cold or corporate
- Storytelling-driven: each piece of jewelry has context and personality
- Low-friction conversion: inquiry-based model, no shopping cart
- Accessible: static HTML/CSS, no frameworks, works without JavaScript

## Colors

Each concept defines its own palette via CSS custom properties. The system organizes colors by role within each concept, not by global scale.

### Editorial Concept (01-editorial)
- **Paper** (#f7f4ee): Warm off-white background — the paper of a luxury magazine
- **Ink** (#1c1a17): Near-black for text and borders — deep, warm charcoal
- **Accent** (#b3492e): Burnt sienna — editorial accent for highlights and callouts
- **Soft** (#8b7f74): Muted taupe — secondary text and captions

### Terracotta Concept (02-terracotta)
- **Clay** (#c96f4a): Warm terracotta — primary action color
- **Clay Deep** (#a4502f): Darker terracotta — hover states and emphasis
- **Cream** (#f4e9dc): Warm cream — primary background
- **Sand** (#e9d8c3): Light sand — secondary backgrounds
- **Earth** (#5b4636): Dark brown — primary text
- **Olive** (#7a7a52): Muted olive — accent for tags and labels

### Sea Glass Concept (03-seaglass)
- **Deep** (#0f3d4a): Deep teal — primary dark
- **Sea** (#2e7d8a): Ocean teal — primary accent
- **Foam** (#eaf4f3): Light aqua — primary background
- **Sand** (#e7e3d7): Warm sand — secondary background
- **Glass** (#8fc1bd): Seafoam green — accent for signatures and details

### Herbarium Concept (04-herbarium)
- **Green** (#3f5940): Forest green — primary accent
- **Green Deep** (#2c4030): Dark forest — text and borders
- **Paper** (#f8f5ec): Aged paper — background
- **Moss** (#7d8c6f): Sage green — secondary accent
- **Rust** (#a05c3b): Botanical rust — accent for Latin names

### Dark Lux Concept (05-darklux)
- **Gold** (#c8a24e): Antiqued gold — primary accent
- **Gold Dim** (#8f7439): Muted gold — borders and subtle details
- **Bg** (#101013): Near-black — primary background
- **Panel** (#17171c): Dark charcoal — elevated surfaces
- **Txt** (#d9d5cc): Warm cream — primary text

### Retro 70s Concept (06-retro70)
- **Cream** (#f5edd8): Vintage cream — background
- **Mustard** (#d9a441): Harvest gold — primary accent
- **Rust** (#c05c33): Burnt orange — secondary accent
- **Olive** (#6b7a3f): Avocado green — tertiary accent
- **Brown** (#4a3226): Dark brown — text and borders

### Wabi-Sabi Concept (07-wabisabi)
- **Paper** (#f2efe8): Natural paper — background
- **Ink** (#3b3a36): Warm charcoal — text
- **Stone** (#9a958a): Natural stone — secondary text
- **Aki** (#a3805c): Autumn gold — accent for Japanese details

### Sketchbook Concept (08-sketchbook)
- **Paper** (#fdfbf4): Graph paper cream — background
- **Pencil** (#4a4a4a): Graphite — primary text
- **Red** (#c0392b): Pencil red — accent for corrections and notes
- **Blue** (#3a6ea8): Pen blue — secondary accent

### Art Deco Concept (09-artdeco)
- **Cream** (#f0e7d3): Ivory — background
- **Gold** (#b28a3e): Deco gold — primary accent
- **Ink** (#263f3c): Deep teal — text
- **Deep** (#16302d): Dark teal — hero background

### Swiss Concept (10-swiss)
- **Ink** (#111): Pure black — text and borders
- **Bg** (#fff): Pure white — background
- **Red** (#e6321e): Swiss red — primary accent
- **Grey** (#efefef): Light grey — secondary backgrounds

### Linen Concept (11-linen)
- **Linen** (#f1ece2): Natural linen — background
- **Thread** (#8a7a5e): Embroidery thread — secondary text
- **Sage** (#9aa48b): Sage green — accent for stitching details
- **Ink** (#3d372e): Dark brown — primary text
- **Berry** (#8a5a63): Dusty rose — accent color

### Memphis Concept (12-memphis)
- **Bg** (#faf5ec): Warm white — background
- **Ink** (#22242a): Near-black — text and borders
- **C1** (#e8b64c): Sunshine yellow — primary accent
- **C2** (#7fae9e): Mint green — secondary accent
- **C3** (#d0785a): Coral — tertiary accent

### Named Rules

**The One-Accent Rule.** Each concept uses one dominant accent color, applied to ≤15% of any given screen. The rarity creates emphasis; overuse destroys it.

**The Warmth Rule.** No concept uses pure white (#fff) or pure black (#000) for backgrounds or text. All neutrals carry warm undertones to maintain the handmade character.

## Typography

**Display Font:** Varies by concept (Playfair Display, Fraunces, Marcellus, EB Garamond, Cinzel, Shrikhand, Cormorant, Caveat, Poiret One, Inter Tight, Unbounded)
**Body Font:** Varies by concept (Inter, Mulish, IBM Plex Sans, PT Sans, Manrope, Nunito, Rubik, Neucha, Cormorant)
**Label/Mono Font:** Varies by concept (Caveat, PT Sans, IBM Plex Mono, Noto Serif JP)

**Character:** Each concept pairs a distinctive display face with a legible body face. The display font carries the concept's personality; the body font ensures readability. All fonts are loaded from Google Fonts.

### Hierarchy
- **Display** (400–800 weight, clamp(2.5rem, 11vw, 9.5rem), 0.92 line-height): Hero headlines only — maximum visual impact
- **Headline** (400–500 weight, clamp(1.7rem, 4vw, 3rem), 1.1–1.2 line-height): Section titles
- **Title** (400–600 weight, clamp(1.1rem, 1.5vw, 1.35rem), 1.3 line-height): Card titles, subsection headers
- **Body** (300–400 weight, clamp(0.9rem, 1.2vw, 1.1rem), 1.65–1.75 line-height): Paragraphs and descriptions
- **Label** (500 weight, 0.72rem, 0.2em letter-spacing, uppercase): Navigation, kicker text, captions

### Named Rules

**The Display restraint Rule.** Display fonts appear only in hero sections and major headings. They never appear in cards, labels, or body text.

**The Weight contrast Rule.** Headings use significantly heavier weight than body text (typically 2–3 weight steps apart) to create clear hierarchy without relying on size alone.

## Layout

**Grid:** Each concept uses CSS Grid or Flexbox with responsive breakpoints. The default grid is 12-column for complex layouts (editorial, swiss) or simpler 2–4 column grids for card-based layouts.

**Container:** Max-width constrained to 1060–1240px depending on concept. Page padding is 4–6vw.

**Density:** Moderate — generous whitespace between sections (60–120px), tighter spacing within components (16–32px).

**Responsive Breakpoints:**
- Desktop: 1024px+ (default)
- Tablet: 768px–1023px (2-column grids, adjusted spacing)
- Mobile: <768px (single-column, stacked layout)

**Spacing Rhythm:** Sections use `clamp(60px, 9vw, 120px)` vertical padding. Components use 8px base unit scale (8, 16, 24, 32, 48, 64).

## Elevation & Depth

Each concept uses a different depth strategy:

- **Editorial:** Flat with subtle borders (1px solid)
- **Terracotta:** Soft shadows (box-shadow: 24px 24px 0)
- **Sea Glass:** Gradient overlays on images
- **Dark Lux:** Tonal layering with gold borders
- **Retro 70s:** Hard offset shadows (box-shadow: 6px 6px 0)
- **Wabi-Sabi:** Flat, depth through spacing and whitespace
- **Memphis:** Playful hard shadows with color (box-shadow: 8px 8px 0 var(--c1))

### Shadow Vocabulary

- **Ambient** (`box-shadow: 0 4px 24px rgba(0,0,0,0.12)`): Subtle lift for cards and elevated surfaces
- **Hard Offset** (`box-shadow: 6px 6px 0 var(--accent)`): Graphic, illustrative depth for neobrutalist concepts
- **Color Shadow** (`box-shadow: 8px 8px 0 var(--c1)`): Memphis-style playful depth with colored shadows

### Named Rules

**The Shadow-intent Rule.** Shadows are never decorative. Each shadow communicates a specific state: rest (ambient), hover (elevated), or active (compressed).

## Shapes

**Corner Strategy:** Varies by concept:
- Sharp corners (0px) for Swiss, Editorial
- Small radius (4–8px) for most concepts
- Large radius (14–22px) for Terracotta, Memphis
- Pill shape (999px) for buttons and tags
- Arch shape (260px 260px 22px 22px) for Terracotta hero images

**Borders:** 1–3px solid borders are common across concepts, typically matching the text color or accent color.

**Clipping:** Some concepts use organic shapes (Memphis blob, Terracotta arch) for hero images.

## Components

### Buttons
- **Shape:** Pill (999px) for Terracotta, Memphis; sharp (0px) for Swiss, Editorial; rounded (16px) for most others
- **Primary:** Solid fill with accent color, white or light text
- **Hover:** Darker shade + translateY(-2px) lift
- **Secondary / Ghost:** Outlined with accent color, transparent background

### Cards
- **Corner Style:** Varies by concept (0–22px radius)
- **Background:** White or concept-specific light tone
- **Shadow Strategy:** Per Elevation section
- **Border:** 1–3px solid, matching concept's ink/border color
- **Internal Padding:** 16–24px

### Navigation
- **Style:** Fixed or static header with horizontal links
- **Typography:** Label style (0.72rem, uppercase, 0.2em letter-spacing)
- **States:** Hover changes color or adds underline
- **Mobile:** Hamburger menu or simplified layout

### Hero Sections
- **Layout:** Full-height or min-height:100vh with centered content
- **Background:** Solid color, gradient, or full-bleed image
- **Content:** Display headline + subtitle + CTA button

### Gallery Grids
- **Layout:** CSS Grid with varying column counts (2–4 columns)
- **Image Treatment:** Object-fit:cover with hover scale effect
- **Captions:** Absolute-positioned or below image with price and name

## Do's and Don'ts

### Do:
- **Do** use concept-specific color tokens — each concept is self-contained
- **Do** maintain warm neutrals — no pure white or pure black backgrounds
- **Do** use display fonts sparingly — hero headlines only
- **Do** provide clear visual hierarchy through weight and size contrast
- **Do** include hover states on all interactive elements
- **Do** use responsive images with loading="lazy" and width/height attributes
- **Do** maintain consistent spacing rhythm (8px base unit)

### Don't:
- **Don't** mix tokens between concepts — each world is independent
- **Don't** use pure white (#fff) or pure black (#000) for backgrounds
- **Don't** apply display fonts to body text or labels
- **Don't** use shadows decoratively — each shadow communicates state
- **Don't** skip mobile responsive design — all concepts must work on phones
- **Don't** use JavaScript for visual effects — CSS only
- **Don't** overload screens with accent colors — maintain the One-Accent Rule
