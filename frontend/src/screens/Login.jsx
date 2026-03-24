import "./Login.css";
import { signIn, signUp } from "../api/auth";

function Login() {
  const handleSignIn = () => {
    signIn(); // redirect to Cognito
  };

  const handleSignUp = () => {
    signUp(); // redirect to Cognito
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