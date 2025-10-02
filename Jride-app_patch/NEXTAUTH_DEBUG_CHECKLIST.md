# NextAuth Debug Checklist

1. Ensure `.env.local` has correct values.
2. In Google Cloud Console > OAuth, add BOTH redirect URIs:
   - http://localhost:3000/api/auth/callback/google
   - https://app.jride.net/api/auth/callback/google
   - https://jride-app.vercel.app/api/auth/callback/google
3. In Vercel dashboard, add all env vars from `.env.local`.
4. Redeploy from Vercel after saving env vars.
5. If error persists, check Vercel logs for `redirect_uri_mismatch`.
