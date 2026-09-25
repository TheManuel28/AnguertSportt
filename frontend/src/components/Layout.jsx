import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-contenido">{children}</main>
      <footer className="app-footer">
        <p>Angher Sport · Proyecto Capstone AS-06</p>
      </footer>
    </div>
  );
}