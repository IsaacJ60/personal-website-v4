import { login } from "../actions";
import styles from "@/features/photo-portfolio/admin.module.css";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <section className={styles.login}>
    <h1>Portfolio admin</h1><p>Sign in with your existing admin account.</p>
    <form action={login}>
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p role="alert">Couldn’t sign in. Check your admin credentials and try again.</p>}
      <button className={styles.primary}>Sign in</button>
    </form>
  </section>;
}
