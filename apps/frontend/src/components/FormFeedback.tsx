export function FormFeedback({ error }: { error: string }) {
  if (!error) return null;
  return <p className="form-error">{error}</p>;
}
