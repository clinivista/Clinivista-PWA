---
name: Playwright on NixOS — system Chromium setup
description: How to get Playwright browser tests running in this NixOS Replit environment without library errors.
---

# Playwright on NixOS — system Chromium setup

## The rule
Install `chromium` as a Nix system dependency, then point Playwright's `executablePath` to `which chromium`. Do NOT rely on Playwright's own downloaded Chromium (`playwright install chromium`) — those binaries fail with missing shared-library errors (`libgbm.so.1`, `libudev.so.1`) because NixOS doesn't use the standard Linux library paths.

**Why:** Playwright's bundled headless shell is a generic Linux binary that expects `/usr/lib` paths. NixOS puts libraries in `/nix/store`. The system-installed `chromium` package wraps the binary with the correct Nix-provided library paths.

**How to apply:**
1. `installSystemDependencies({ packages: ["chromium"] })` — installs the Nix-packaged Chromium.
2. In `playwright.config.ts`, set `executablePath` to the resolved path:
   ```ts
   import { execSync } from "child_process";
   const CHROMIUM = execSync("which chromium").toString().trim();
   // …
   use: { executablePath: CHROMIUM, launchOptions: { args: ["--no-sandbox"] } }
   ```
3. `args: ["--no-sandbox"]` is required in the Replit container environment.

## Radix Select quirk in Playwright
Radix UI `<Select>` renders the dropdown in a portal that Playwright marks as "outside of the viewport". Fix: use `{ force: true }` on the option click.
```ts
await page.getByRole("option", { name: "Santiago" }).click({ force: true });
```

## Playwright Testing Library confusion
Playwright uses `page.getByPlaceholder()` — NOT `page.getByPlaceholderText()` (that's Testing Library / jsdom API). Mixing them gives a runtime "not a function" error.
