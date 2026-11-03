Interview Assistant localhost fix

The old responder returned hard-coded scripts whenever an AI key was absent or a provider request failed. The isolated launcher did not load an AI key, so unrelated spoken questions received generic scripted responses.

The responder now uses the latest spoken question, the current practice topic as background only, and up to six prior turns belonging to the authenticated account. General questions receive direct factual answers; interview examples must not invent personal employment or achievements. Provider failures return an explicit error and do not save a fabricated answer or advance the interview.

Configuration: backend/.env.local-e2e (gitignored), GEMINI_API_KEY or GOOGLE_API_KEY; optional GEMINI_INTERVIEW_MODEL, default gemini-2.5-flash. Keep keys server-side. Restart the local backend after configuration changes. No production activation is included.

Verification: node tests/interview-assistant.test.cjs from backend; backend and mobile TypeScript checks. Actual Gemini calls for "What is SQL?" and "What is REST?" returned distinct relevant answers. These provider tests are not real-user microphone tests.

Device check: reload the local development app, open Interview Prep, tap the existing microphone, ask "What is SQL?", then "How is it different from REST?". Confirm the recognized words and answers match. Test a normal interview question next. The existing display and spoken-answer controls are unchanged. Model answers can still be inaccurate; no 100% accuracy claim is made.
