import LoginForm from "./LoginForm";
import styles from "./login.module.css";
import { Scissors, Truck, BarChart2 } from "lucide-react";

export default function LoginPage() {
  return (
    <div className={styles.split}>
      <section className={styles.brandPanel} aria-hidden="true">
        <div className={styles.brandInner}>
          <div className={styles.brandLogo}>
            <span className={styles.logoMark}>S</span>
            <span>SIAT</span>
          </div>
          <h2 className={styles.brandHeadline}>Control de producción textil, de principio a fin.</h2>
          <ul className={styles.brandList}>
            <li><Scissors size={16} /> Pedidos y órdenes de producción</li>
            <li><Truck size={16} /> Salidas e ingresos de talleres</li>
            <li><BarChart2 size={16} /> Despachos y reportes en tiempo real</li>
          </ul>
        </div>
      </section>

      <main className={styles.formPanel}>
        <div className={styles.glassCard}>
          <div className={styles.header}>
            <span className={styles.logoMarkSm} aria-hidden="true">S</span>
            <h1 className={styles.title}>Bienvenido a SIAT</h1>
            <p className={styles.subtitle}>Production Control System · Ingresa con tu cuenta</p>
          </div>
          <LoginForm />
        </div>
        <p className={styles.footerNote}>© {new Date().getFullYear()} E-Textil</p>
      </main>
    </div>
  );
}
