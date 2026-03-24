import "./Login.css";
import { signIn, signUp } from "../api/auth";

function Login({ onAuthSuccess }) {
  const handleSignIn = async () => {
    const user = await signIn();
    onAuthSuccess(user);
  };

  const handleSignUp = async () => {
    const user = await signUp();
    onAuthSuccess(user);
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