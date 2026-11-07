import {useEffect, useRef, useState} from 'react';
import {io} from 'socket.io-client';
import {useAuth0} from '@auth0/auth0-react';
import {authConfig} from './auth-config';

const uncertain = 'No se pudo confirmar la entrega. Revisa la conversación antes de reenviar.';

function Media({message}) {
  const [failed, setFailed] = useState(false);
  if (message.tipo === 'youtube' && /^[\w-]{11}$/.test(message.videoId || '')) {
    return <iframe title="Video de YouTube" allowFullScreen height="270"
      src={'https://www.youtube-nocookie.com/embed/' + message.videoId} />;
  }
  if (!['image', 'video'].includes(message.tipo)) return null;
  return <>
    {message.tipo === 'image'
      ? <img src={message.mensaje} alt="Imagen enviada en el chat" onError={() => setFailed(true)} />
      : <video src={message.mensaje} controls preload="auto" onError={() => setFailed(true)} />}
    {failed && <p className="media-error" role="status">
      {message.tipo === 'image' ? 'No se pudo cargar la imagen.' : 'No se pudo cargar el video.'}
    </p>}
  </>;
}

export default function Chat({name}) {
  const {getAccessTokenSilently} = useAuth0();
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const socketRef = useRef(null);
  const pending = useRef(null);
  const sequence = useRef(0);
  const input = useRef(null);
  const list = useRef(null);

  useEffect(() => {
    const socket = io({
      autoConnect: false,
      auth: callback => {
        getAccessTokenSilently({authorizationParams: {audience: authConfig.audience}})
          .then(token => callback({token}))
          .catch(() => callback({token: ''}));
      }
    });
    socketRef.current = socket;
    function finish(id, result) {
      if (!pending.current || pending.current.id !== id) return;
      clearTimeout(pending.current.timer);
      const savedDraft = pending.current.draft;
      pending.current = null;
      setWaiting(false);
      setDraft(result?.ok ? '' : savedDraft);
      if (result?.ok) setStatus('Mensaje enviado.');
      else if (result?.error) {
        setStatus('');
        setError('Mensaje rechazado: ' + result.error);
      } else setStatus(uncertain);
      input.current?.focus({preventScroll: true});
    }
    socket.on('connect', () => {setConnected(true); setError('');});
    socket.on('disconnect', () => {
      setConnected(false);
      if (pending.current) finish(pending.current.id, null);
    });
    socket.on('connect_error', failure => {
      setConnected(false);
      setError(failure.data?.code === 'AUTH_REQUIRED'
        ? 'La sesión no autoriza el chat. Cierra sesión y vuelve a entrar.'
        : 'No se pudo conectar con el chat. Comprueba que el servidor esté iniciado.');
    });
    socket.on('Mensaje-Rechazado', result => {
      if (!pending.current) setError('Mensaje rechazado: ' + result.error);
    });
    socket.on('Evento-Mensaje-Server', raw => {
      try {
        const message = JSON.parse(raw);
        setMessages(previous => [...previous, message]);
      } catch {
        setError('Se recibió una respuesta de chat no válida.');
      }
    });
    socketRef.current.finish = finish;
    socket.connect();
    return () => {
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = null;
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [getAccessTokenSilently]);

  useEffect(() => {
    list.current?.lastElementChild?.scrollIntoView({block: 'nearest'});
  }, [messages]);

  function send(event) {
    event.preventDefault();
    const socket = socketRef.current;
    if (!socket?.connected || pending.current || !draft.trim()) return;
    setError('');
    setStatus('Enviando…');
    const id = ++sequence.current;
    pending.current = {
      id, draft,
      timer: setTimeout(() => socket.finish(id, null), 5000)
    };
    setWaiting(true);
    socket.emit('Evento-Mensaje-Server', JSON.stringify({
      nombre: name, mensaje: draft, color: '#245b78'
    }), result => socket.finish(id, result));
  }

  return <div className="shell">
    <div id="connection" role="status" aria-atomic="true"
      data-state={connected ? 'connected' : 'disconnected'}>
      {connected ? 'Conectado al backend' : 'Desconectado'}
    </div>
    <main aria-label="Conversación del chat">
      <div className="conversation-heading"><h2>Conversación</h2><span>Mensajes de esta sesión</span></div>
      <div className="conversation">
        {!messages.length && <div id="welcome" className="empty">
          <span className="empty-mark" aria-hidden="true">↗</span>
          <h3>La conversación empieza contigo</h3>
          <p>Escribe un saludo o comparte una URL de imagen o video para comenzar.</p>
        </div>}
        <ul id="messages" ref={list} aria-label="Mensajes" aria-live="polite" aria-relevant="additions">
          {messages.map((message, index) => <li key={index}>
            <b className="message-name" style={{
              color: /^#[\da-f]{6}$/i.test(message.color || '') ? message.color : '#245b78'
            }}>{message.nombre}</b>
            <span className="message-text">{message.mensaje}</span>
            <Media message={message} />
          </li>)}
        </ul>
      </div>
    </main>
    <section className="composer" aria-label="Escribir un mensaje">
      <p className="composer-heading">Comparte algo con el grupo</p>
      <div id="error" role="alert" aria-atomic="true">{error}</div>
      <form onSubmit={send} aria-busy={waiting}>
        <label>Nombre<input id="nombre" maxLength={80} value={name} readOnly autoComplete="nickname" /></label>
        <label>Mensaje<input id="m" ref={input} maxLength={2000} autoComplete="off" required
          aria-describedby="message-hint" placeholder="Escriba un mensaje o URL"
          value={draft} readOnly={waiting} onChange={event => setDraft(event.target.value)} /></label>
        <button disabled={!connected || waiting || !draft.trim()}>Enviar</button>
      </form>
      <p id="message-hint" className="composer-hint">Texto o una URL HTTP/HTTPS de imagen, video o YouTube.</p>
      <p id="send-state" role="status" aria-atomic="true">{status}</p>
    </section>
  </div>;
}
