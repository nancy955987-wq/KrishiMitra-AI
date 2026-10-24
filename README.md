# KrishiMitra AI — Competition MVP

A responsive multilingual farmer-assistance prototype with a **secure server-side Gemini API integration**, image-based crop review (when API is configured), rule-based fallback guidance, live weather lookup, and official-source directory links.

## Run locally (Windows / VS Code)

1. Install Node.js 18 or newer.
2. Extract this ZIP and open the `krishimitra_farmer_assistant` folder in VS Code.
3. Copy `.env.example` to a new file named `.env`.
4. For real AI, get a Gemini API key from Google AI Studio and put it in `.env`:
   `GEMINI_API_KEY=your_actual_key_here`
5. Open a terminal in this folder and run `npm start`.
6. Open **http://localhost:3000** (do not open `index.html` directly).

No `npm install` is needed: the backend uses Node's built-in modules and `fetch`. The API key stays on the server and is never sent to browser JavaScript. Never upload `.env` or share your key. Free-tier quotas and availability depend on Google's current terms and your account.

## What works

- Responsive dashboard and English/Hindi UI toggle.
- Server-side Gemini chat when `GEMINI_API_KEY` is configured.
- Hindi/English prompt instructions, cautious farming advice, and transparent uncertainty.
- Crop symptom checklist and local photo preview. With a configured Gemini API key, the photo is also sent to the server for a **preliminary visual review**; this is not a confirmed disease diagnosis. Supported image types: JPEG, PNG, WEBP; max 5 MB in the UI.
- Live weather lookup through Open-Meteo geocoding and forecast endpoints.
- Searchable scheme cards linking to official portals.
- Voice input where the browser supports Web Speech API.
- `/api/health` endpoint reports whether AI is configured.
- No Aadhaar, bank account, OTP or password fields.

## Important limitations

- Without a key, the app shows its honest rule-based demo fallback; it does not pretend that fallback is live AI.
- The AI is not a government service and does not access PM-KISAN records or determine scheme eligibility. Official links are supplied for verification; the backend does not crawl or live-verify those websites.
- Crop image analysis can be wrong. Confirm disease/pest identification and any treatment with a local KVK/agriculture officer. Do not use AI alone for pesticide dosage or high-impact decisions.
- Weather depends on Open-Meteo and internet availability; forecast is not a guarantee. For official alerts, consult IMD.
- No database or user login is configured in this MVP.

## Official resources

- PM-KISAN: https://pmkisan.gov.in/
- PM Fasal Bima Yojana: https://pmfby.gov.in/
- Soil Health Card: https://soilhealth.dac.gov.in/
- myScheme: https://www.myscheme.gov.in/
- ICAR KVK directory: https://kvk.icar.gov.in/
- IMD: https://mausam.imd.gov.in/
- AGMARKNET: https://agmarknet.gov.in/
- Weather provider: https://open-meteo.com/

## Quick test

- Open `http://localhost:3000/api/health` and confirm `aiConfigured` is `true` after setting your key.
- Ask the chatbot: “My wheat leaves are turning yellow. What should I check first?”
- Ask: “How do I check PM-KISAN beneficiary status?”
- Upload a clear crop photo in Crop Doctor to test preliminary AI image review.
- Enter a district in Weather & Advice and fetch the forecast.
