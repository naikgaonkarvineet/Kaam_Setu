# KaamSetu

A Hindi-first wage-transparency MVP for daily-wage workers, contractors, and employers.

## Run locally

```powershell
npm install
npm run dev
```

The interface starts in demo mode and works without credentials. To connect live data:

1. Create a Supabase project.
2. Run `server/schema.sql` in its SQL editor.
3. Copy `.env.example` to `.env` and add the project URL, anon key, and service-role key.
4. Run `npm install` in both the repository root and `server/`.
5. Start the API with `cd server; npm start`.

## Product flows

- **Worker:** browse Hindi job cards, compare fair wage indicators, and apply.
- **Contractor:** maintain a crew, log today’s wage, and see the city average change.
- **Employer:** post a job, compare the offer against the live fair wage, and inspect applicants.

The shared fair-wage rule lives in `server/routes/wages.js`: 10% below average is **कम**, within ±10% is **उचित**, and above that is **ज़्यादा**.

Contact details must only be returned from an accepted job record. The provided schema uses RLS as the baseline; before production, apply the final policies based on the authenticated user ID in each request.
