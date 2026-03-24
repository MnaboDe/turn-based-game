import "./Login.css";

function Login({ onSignIn }) {
  return (
    <div className="login-container">
      <h2>Login</h2>

      <div className="login-actions">
        <button onClick={onSignIn}>Sign In</button>
        <button>Sign Up</button>
      </div>
    </div>
  );
}

export default Login;