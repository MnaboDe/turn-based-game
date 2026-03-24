import "./Login.css";
import { signIn, signUp } from "../api/auth";

function Login({ onSignIn }) {
  const handleSignIn = async () => {
    await signIn();
    onSignIn();
  };

  const handleSignUp = async () => {
    await signUp();
    onSignIn();
  };

  return (
    <div className="login-container">
      <h2>Login</h2>

      <div className="login-actions">
        <button onClick={handleSignIn}>Sign In</button>
        <button onClick={handleSignUp}>Sign Up</button>
      </div>
    </div>
  );
}

export default Login;