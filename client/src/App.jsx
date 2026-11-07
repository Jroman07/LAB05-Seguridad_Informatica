import {useState} from 'react';
import {useAuth0} from '@auth0/auth0-react';
import Chat from './Chat';

export default function App() {
  const {isLoading, isAuthenticated, user, error, loginWithRedirect, logout} = useAuth0();
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const name = user?.name || user?.nickname || 'Participante';

  async function enter(signup = false) {
    setBusy(true);
    setActionError('');
    try {
      await loginWithRedirect(signup ? {authorizationParams: {screen_hint: 'signup'}} : {});
    } catch {
      setActionError('No se pudo abrir el inicio de sesión. Inténtalo de nuevo.');
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      await logout({logoutParams: {returnTo: window.location.origin}});
    } catch {
      setActionError('No se pudo cerrar la sesión. Inténtalo de nuevo.');
      setBusy(false);
    }
  }

  return <>
    <header>
      <div className="header-inner">
        <div>
          <p className="eyebrow">Universidad Nacional · Laboratorio 08</p>
          <h1>UNA Chat</h1>
          <p className="subtitle">Un espacio para compartir texto, imágenes y videos.</p>
        </div>
        {isAuthenticated && <div className="session">
          <span>Hola, {name}</span>
          <button type="button" onClick={leave} disabled={busy}>Cerrar sesión</button>
        </div>}
      </div>
    </header>
    {actionError && <p className="auth-error" role="alert">{actionError}</p>}
    {isLoading ? <main className="auth-card" aria-busy="true">
      <p role="status">Comprobando tu sesión…</p>
    </main> : isAuthenticated ? <Chat name={name} /> : <main className="auth-card">
      <p className="auth-eyebrow">BIENVENIDO A UNA CHAT</p>
      <h2>Conversa con tu grupo</h2>
      <p>Inicia sesión para entrar a la sala y compartir tus mensajes.</p>
      {error && <p className="auth-error" role="alert">
        No se pudo completar el acceso: {error.message}
      </p>}
      <div className="auth-actions">
        <button type="button" disabled={busy} onClick={() => enter()}>Iniciar sesión</button>
        <button type="button" className="secondary" disabled={busy}
          onClick={() => enter(true)}>Crear cuenta</button>
      </div>
    </main>}
  </>;
}
