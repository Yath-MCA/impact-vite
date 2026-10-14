# Navigation Workflow (Updated)

## Overview
This workflow describes the navigation logic for editor, PDF, TOC, and thumbnail panels, including robust handling for prev/next page controls and blank/missing elements.

## Key Steps
1. User action triggers navigation (scroll, TOC click, thumbnail click, PDF control click).
2. Navigation logic checks for element/page existence.
3. If element is missing, incrementally checks next/previous page until found or wraps to first/last page as needed.
4. For prev/next buttons:
   - `leftpagebut`: increments page, wraps to last page if exceeded.
   - `rightpagebut`: decrements page, wraps to first page if below start.
5. Updates PDF view, thumbnail, and page controls.
6. Focuses editor target when applicable.
7. Syncs TOC/floats active state.

## Edge Cases
- Handles blank pages and missing elements by scanning forward/backward.
- Wraps navigation for prev/next controls to ensure seamless user experience.

## Diagram
See navigation-workflow.mmd for updated Mermaid diagram.

---
Last updated: March 17, 2026
