import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/team/$code')({
  component: TeamPage
});

function TeamPage() {
  const { code } = Route.useParams();
  return <Navigate to="/lobby/$code" params={{ code }} replace />;
}
