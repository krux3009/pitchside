# Pitchside frontend

React 19 + Vite. Hand-rolled styling (tokens.css + global.css, no CSS
framework) and a hand-rolled en/zh i18n layer. See the repo root README for
architecture and data flow.

```bash
npm install
npm run dev      # :5173, talks to VITE_API_URL (default http://localhost:8000)
npm run build
```

## Credits

Flag artwork in `src/assets/flags/` is a 48-country subset of
[lipis/flag-icons](https://github.com/lipis/flag-icons) (MIT License).
