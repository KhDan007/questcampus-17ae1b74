import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/apply/prep")({
  component: () => <Navigate to="/dashboard" replace />,
});
