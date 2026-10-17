'use strict';
function mediaURL(value) {
  if (typeof value !== 'string' || /[\s<>"'`\\\u0000-\u001f]/u.test(value)) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch { return null; }
}
function getYTVideoId(value) {
  const url = mediaURL(value);
  if (!url) return null;
  let id;
  if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
  else if (['youtube.com', 'www.youtube.com'].includes(url.hostname)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else id = /^\/embed\/([^/]+)$/.exec(url.pathname)?.[1];
  }
  return /^[\w-]{11}$/.test(id || '') ? id : null;
}
function mediaType(value) {
  const url = mediaURL(value);
  if (!url) return null;
  if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(url.pathname)) return 'image';
  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return 'video';
  return getYTVideoId(value) ? 'youtube' : null;
}
function validarMensaje(raw) {
  if (typeof raw !== 'string' || raw.length > 6000) throw new Error('Formato de mensaje inválido');
  let obj;
  try { obj = JSON.parse(raw); } catch { throw new Error('JSON inválido'); }
  if (!obj || typeof obj !== 'object' || typeof obj.mensaje !== 'string' ||
      (obj.nombre !== undefined && typeof obj.nombre !== 'string')) throw new Error('Campos inválidos');
  const mensaje = obj.mensaje.trim();
  const nombre = (obj.nombre || 'Anónimo').trim();
  if (!mensaje || mensaje.length > 2000 || !nombre || nombre.length > 80) throw new Error('Longitud inválida');
  if (/[<>\u0000-\u001f]/u.test(mensaje + nombre) || /&(?:lt|gt|#0*60|#x0*3c);/i.test(mensaje + nombre) ||
      /(?:javascript|data|vbscript)\s*:/i.test(mensaje + nombre)) throw new Error('Contenido no permitido');
  const tipo = mediaType(mensaje) || 'text';
  if (tipo === 'text' && /(?:https?:|www\.|[a-z][a-z0-9+.-]*:\/\/)/i.test(mensaje)) {
    throw new Error('Solo se permiten URLs de imágenes o videos');
  }
  return JSON.stringify({nombre, mensaje, tipo,
    color: /^#[\da-f]{6}$/i.test(obj.color || '') ? obj.color : '#245b78',
    ...(tipo === 'youtube' ? {videoId: getYTVideoId(mensaje)} : {})});
}
module.exports = {
  is_valid_phone: phone => typeof phone === 'string' && /^[+]*[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/i.test(phone),
  is_valid_url_image: url => mediaType(url) === 'image',
  is_valid_yt_video: url => !!getYTVideoId(url),
  is_valid_url_video: url => ['video', 'youtube'].includes(mediaType(url)),
  getYTVideoId, mediaType, validarMensaje, validateMessage: validarMensaje
};

