import LoginForm from "./LoginForm";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.glassCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>eTextil</h1>
          <p className={styles.subtitle}>Production Control System</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
