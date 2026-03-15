import { Navigate } from 'react-router-dom';

// Register is now handled inside LoginPage with sliding panel
export default function RegisterPage() {
  return <Navigate to="/login" replace />;
}
