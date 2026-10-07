# shared providers

## Purpose / ownership
React providers and hooks used by multiple features.

## Key files
- `AuthProvider.jsx`
- `ClientProvider.jsx`

## Rule
Feature-only context stays under `features/<name>/context`. App-level provider composition stays under `core/providers` or `core/router`.
