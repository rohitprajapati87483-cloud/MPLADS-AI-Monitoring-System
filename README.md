# React + TypeScript + Vite    Heloooooooooo............

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Architecture

```text
React/Vite
   |
   | REST / JSON
   v
FastAPI
   |
   +--> AI risk/action engine
   +--> SQLite database (default)
   +--> SMTP email notification
   +--> optional OpenAI-compatible AI explanation endpoint
```

### Security

- SMTP and AI API keys are backend-only environment variables.
- Never put provider secrets in `VITE_*` variables.
- Deploy behind HTTPS in production.
- Replace SQLite with PostgreSQL for multi-user production use.
- Add authentication/authorization before connecting to official government mailboxes.
- Keep human approval in the action workflow; AI outputs are review signals, not adjudications.
