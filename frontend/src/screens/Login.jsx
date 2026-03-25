import "./Login.css";
import { signIn, signUp } from "../api/auth";

function Login() {
  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error("Sign in redirect failed", error);
    }
  };

  const handleSignUp = async () => {
    try {
      await signUp();
    } catch (error) {
      console.error("Sign up redirect failed", error);
    }
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