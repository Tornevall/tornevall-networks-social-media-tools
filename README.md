# Tornevall Networks Social Media Tools

Tornevall Networks Social Media Tools is a Chrome extension for social-media response workflows.
It uses a personal bearer token from Tools and sends requests through either:
- `https://tools.tornevall.net` (production)
- `https://tools.tornevall.com` (dev / beta)

Responder name and behavior/personality are now stored server-side in Tools and synced from the extension popup.

## Current workflow

1. Register at `tools.tornevall.net`
2. Generate a personal bearer token there
3. Paste that token into the extension popup
4. Optionally enable dev mode to target `tools.tornevall.com`
5. Use the **Test** button to verify your token and the global `provider_openai` configuration
6. Save responder name and behavior so they are stored in Tools for your user account
7. Generate replies through the Tools AI gateway

## Notes

- The bearer token is personal and tied to your user account
- OpenAI execution happens from Tools, not directly from the browser
- The active OpenAI key is resolved from Tools using `provider_openai` with `global=true`
