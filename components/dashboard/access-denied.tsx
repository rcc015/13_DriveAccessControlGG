export function AccessDenied({
  title = "Access denied",
  description = "Your current app role does not allow this module."
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="hero-card">
      <div className="eyebrow">Authorization</div>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
