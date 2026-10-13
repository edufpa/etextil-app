import styles from "./taller.module.css";

export default function Loading() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Taller por proveedor</h1>
        <p className={styles.subtitle}>Cargando trabajo pendiente…</p>
      </div>
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
    </div>
  );
}
