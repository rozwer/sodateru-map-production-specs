# UI-DEMO-PRESENTATION

Removed example/mock/unsaved labels from the normal demo presentation in the app, plugins, disaster map and health screens. Existing generated sample copy is normalized on load with exact checks; user-authored fields remain unchanged. Internal demo routing and local state stay separate from live API state.

Verification: `mise exec -- bunx tsc --noEmit`, `mise exec -- bunx vite build`, `git diff --check` passed on 2026-09-27.
