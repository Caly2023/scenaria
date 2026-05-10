const { genkit } = require('genkit');
const { googleAI } = require('@genkit-ai/google-genai');
const { retry, fallback } = require('genkit/model/middleware');

const ai = genkit({
  plugins: [googleAI({ apiKey: "fake" })]
});

try {
  ai.generate({
    model: "googleai/gemini-1.5-flash",
    prompt: "Hello",
    use: [
      retry({ maxRetries: 2 }),
      fallback(ai, { models: ["googleai/gemini-1.5-pro"] })
    ]
  }).then(console.log).catch(e => console.log("ERROR:", e.message));
} catch (e) {
  console.log("SYNC ERROR:", e.message);
}
