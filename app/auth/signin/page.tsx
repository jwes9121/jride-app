import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in · JRide",
};

export default function SignInPage() {
  // Use a relative callback so it works in local and prod (resolved via NEXTAUTH_URL)
  const callbackUrl = "/";

  return (
    <div style={{display:"grid",placeItems:"center",minHeight:"60vh"}}>
      <div style={{padding:"1.5rem",border:"1px solid #e5e7eb",borderRadius:12, maxWidth:380, width:"100%"}}>
        <h1 style={{marginBottom:12, fontSize:22}}>Sign in</h1>
        <p style={{margin:"0 0 16px 0", opacity:.85}}>Use your Google account:</p>

        {/* Pure anchor to the provider endpoint (avoids any CSP/hydration/JS issues) */}
        <a
          href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          style={{
            display:"inline-block",
            textAlign:"center",
            width:"100%",
            padding:"0.6rem 1rem",
            borderRadius:10,
            border:"1px solid #e5e7eb",
            textDecoration:"none"
          }}
        >
          Continue with Google
        </a>

        <p style={{marginTop:12, fontSize:12, opacity:.6}}>
          If the button seems unresponsive, open <code>/api/auth/signin/google</code> directly.
        </p>
      </div>
    </div>
  );
}
