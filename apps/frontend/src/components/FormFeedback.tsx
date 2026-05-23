import { useAuthUser } from '../context/AuthContext';
import { isAuthFailureMessage } from './SessionExpiredNotice';

export function FormFeedback({ error }: { error: string; next?: string }) {
  const { sessionExpired } = useAuthUser();

  if (!error || sessionExpired || isAuthFailureMessage(error)) return null;
  return <p className="error">{error}</p>;
}
