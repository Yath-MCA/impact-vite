# landing skills

Use when editing `src/features/landing/`.

## Do
- Keep changes in this folder's responsibility.
- Update this README key-files list when adding important files.
- Prefer feature-MVC placement rules in `docs/FEATURE_MVC_STRUCTURE.md`.

## Do not
- Invent parallel ownership in another tree without documenting status.
- Break stable routes (`/validateurl`, `/editor`, `/login`, `/config-manager`).

## Workflows
1. Validation/orchestration → ValidateUrlPage + hook (maintenance, link status, token OTP).
2. Marketing site for `/` → MarketingLandingPage.
3. Presentation/CTA → LandingUI (logos via landingLogos from urlvalidity client/dtd).
4. Session handshake only via `services/session` (DB-error vs conflict classification, landing retry).
5. Keep email link URLs stable.

## Related
- Parent: [../README.md](../README.md) · [../skills.md](../skills.md)
- Index: [docs/SKILLS_AND_WORKFLOWS.md](../../../docs/SKILLS_AND_WORKFLOWS.md)
