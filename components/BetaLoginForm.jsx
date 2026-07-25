export default function BetaLoginForm({
  authMode,
  name,
  username,
  email,
  password,
  errorMessage,
  onAuthModeChange,
  onNameChange,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit
}) {
  const isRegistering = authMode === "register";

  return (
    <main className="page">
      <section className="card login-card">
        <p className="label">{isRegistering ? "Create Account" : "Log In"}</p>
        <h1 className="login-title">Vocab Memo</h1>
        <p className="login-help">
          {isRegistering
            ? "Create an account so your vocab progress can be saved."
            : "Log in to continue studying from your saved progress."}
        </p>

        <form className="login-form" onSubmit={onSubmit}>
          {isRegistering ? (
            <label>
              Name
              <input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Kevin Wang"
              />
            </label>
          ) : null}

          <label>
            {isRegistering ? "Username" : "Username or Email"}
            <input
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              placeholder={isRegistering ? "kw080114" : "kw080114 or student@example.com"}
            />
          </label>

          {isRegistering ? (
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="student@example.com"
              />
            </label>
          ) : null}

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="At least 8 characters"
            />
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button className="reveal" type="submit">
            {isRegistering ? "Create Account" : "Log In"}
          </button>
        </form>

        <button
          className="link-button"
          type="button"
          onClick={() => onAuthModeChange(isRegistering ? "login" : "register")}
        >
          {isRegistering
            ? "Already have an account? Log in"
            : "New here? Create an account"}
        </button>
      </section>
    </main>
  );
}
