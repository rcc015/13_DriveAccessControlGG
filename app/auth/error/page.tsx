interface AuthErrorPageProps {
  searchParams?: Promise<{
    reason?: string;
  }>;
}

const errorMessages: Record<string, string> = {
  missing_code_or_state: "Google returned without the OAuth code/state required to finish login.",
  invalid_oauth_state: "The OAuth state cookie was missing or did not match the callback request.",
  token_exchange_failed: "The app could not exchange the Google authorization code for a session.",
  domain_not_allowed: "The selected Google account is not allowed to access this app."
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const reason = params?.reason ?? "token_exchange_failed";
  const detail = errorMessages[reason] ?? errorMessages.token_exchange_failed;

  return (
    <main className="hero">
      <section className="hero-card hero-card-compact">
        <div className="hero-copy">
          <div className="eyebrow">Authentication Error</div>
          <h2>Google sign-in could not be completed.</h2>
          <p>{detail}</p>
          <p>
            If this keeps happening, verify `APP_BASE_URL` and `GOOGLE_REDIRECT_URI` use the same origin and retry the
            login flow.
          </p>
          <a href="/auth/login" className="section-link">
            Try again &rarr;
          </a>
        </div>
      </section>
    </main>
  );
}
