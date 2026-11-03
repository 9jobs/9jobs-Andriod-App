# Physical-phone localhost connection fix

The physical-phone screenshot's 3 Applied / 1 Interview / 1 Offer exactly matched the old local demo fallback. Code inspection found that an authenticated account could receive those generated records when its backend request failed. Separately, the normal phone launcher used mobile/.env defaults, while the verified emulator used an explicit local backend and sheet integration. A phone cannot reach the PC backend through its own 127.0.0.1.

The local-only correction:

- `mobile/lib/data/mobile-sync-repository.ts`: real accounts no longer receive generated demo applications/interviews/offers/messages. Offline cache must match both account and backend origin. Legacy unscoped bytes remain stored but are not treated as verified account data. Preview-only behavior remains available.
- `mobile/lib/data/backend-auth-token.ts` and `mobile/lib/utils/storage.ts`: backend token reuse is scoped to account and backend origin. Switching from a live/default backend to the isolated local backend causes a fresh real Clerk exchange, rather than reusing an incompatible token.
- `backend/scripts/local-phone-bridge.cjs`: private assigned LAN IPv4 only, port 3101, forwards to existing loopback backend 3100. Bearer authentication remains enforced by the original backend; no sessions or roles are fabricated. HTTP and existing Socket.IO transport are forwarded. No public tunnel or firewall changes.
- `backend/scripts/start-localhost-phone.cjs`: verifies the upstream reports isolated local mode, starts the LAN transport, and runs existing Expo dev client on 8091 with the local backend URL, sheet integration enabled and the existing Clerk Development publishable key.
- `mobile/package.json`: `npm run phone` uses this local launcher, instead of inheriting the default mobile backend accidentally.
- `backend/src/app.ts`: local-mode health response identifies the isolated test environment; no private configuration is returned.

Current URLs: phone backend `http://192.168.1.33:3101`, Metro `http://192.168.1.33:8091`, existing backend `http://127.0.0.1:3100`, Admin `http://localhost:3001`. The user confirmed healthy/localTestEnvironment from Chrome on the actual Wi-Fi phone. PC transport checks returned health 200 and unauthenticated private/admin APIs 401. Metro served an Android manifest with the correct LAN asset origin and a 14,297,067-byte bundle containing the intended local backend and real-account fallback guard.

13 relevant mobile tests and mobile TypeScript passed. Coverage includes no fabricated real-account activity, rejection of legacy/wrong-backend caches without deleting stored bytes, retained genuine matching cache, fresh exchange after backend switching, and existing repository behavior. Source Sheets, Client IDs, accounts, job rows, UI layouts/navigation, production and Google triggers were not modified.

The user's phone is using Wi-Fi, not ADB. The agent cannot capture its screen over that connection. A new local QR was supplied at ignored `.work/localhost-e2e/phone-local-qr.png`. **The actual physical-phone Mahir 66-Applied result remains pending until the user opens this bundle and authenticates.** Network health and bundle checks alone are not proof of that result. Temporary local instrumentation observes genuine incoming Clerk sessions and stores only verification outcomes, never tokens/passwords. Any phone proof will be in ignored `real-phone-flow.json`.

For subsequent local starts, keep the existing isolated backend running, then in another terminal:

```powershell
cd D:\9jobs-App\mobile
npm run phone
```

If multiple private adapters exist, specify the PC's actual Wi-Fi/Ethernet LAN IP:

```powershell
npm run phone -- 192.168.1.33
```

The services are currently running; do not launch duplicates. Same-Wi-Fi phone must use the existing installed 9JOBS development build and genuine Mahir Development login. No password/OTP is needed in chat. The computer/backend/Metro must remain running. Nothing was deployed to production.
