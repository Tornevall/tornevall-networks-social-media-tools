# SocialGPT – Chrome Extension for Context-Aware ChatGPT Replies

SocialGPT is a powerful Chrome extension for injecting ChatGPT into your social media workflows. It lets you mark
elements on a page (comments, posts, threads), define tone and style, and generate responses directly with context –
perfect for crafting quick replies, sarcastic roasts, or fact-based rebuttals.

## June 2025 Update Highlights

- Floating panel UI with live prompt, context viewer, and output field
- Tone selector with presets like "Brutally honest", "Academic and precise", "Snarky", or custom
- Response length control: from "as short as possible" to extended replies
- Panel is draggable, dockable and collapsible on double-click
- Multi-element context marking for full thread responses
- Automatic Facebook profile name detection as responder alias
- Modify previous replies in-place
- Supports multiple models: gpt-4o, gpt-4, and o3-mini

## How it is written

Yeah, I am not a front end developer so I asked my way through this one.
Built with help from OpenAI, model o3 and 4o.

## How it works

1. Right-click any comment, post, or thread block
2. Select "Mark element for GPT reading" to store it as context
3. Open the reply panel via "Reply/Add text" in the context menu
4. Enter your prompt, choose tone, length and model
5. Press Send to generate a reply with context-aware precision

## Features for Power Users

- Designed for rapid response workflows in public social media threads
- Ideal for rebuttals, satire, activism, moderation, or education
- Maintains full control over length, tone and structure
- Can be used to refine, translate or rewrite replies live

## Requirements

- OpenAI API key (required for ChatGPT access)
- Chrome or any Chromium-compatible browser

## Privacy

No data is currently sent to third-party servers. All processing is local except the direct call to OpenAI’s API
endpoint. Your API key is stored locally using chrome.storage.sync and never shared.
