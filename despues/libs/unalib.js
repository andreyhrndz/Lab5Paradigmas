// Módulo de validación y seguridad — UNA Lib (despues)

module.exports = {
  dummy_1: function() { return true; },

  // Sanitización de entidades HTML para neutralizar inyecciones de código (XSS)
  sanitizeHtml: function (str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/javascript:/gi, '');
  },

  // Validación y normalización de color hexadecimal para prevenir inyecciones CSS
  sanitizeColor: function (color) {
    if (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color.trim())) {
      return color.trim();
    }
    return '#000000'; // Color por defecto seguro
  },

  // Validación y sanitización de nombre de usuario
  sanitizeName: function (nombre) {
    if (typeof nombre !== 'string' || !nombre.trim()) {
      return 'Anonimo';
    }
    return this.sanitizeHtml(nombre.trim());
  },

  // Lógica que valida si un teléfono está correcto
  is_valid_phone: function (phone) {
    if (!phone || typeof phone !== 'string') {
      return false;
    }
    var isValid = false;
    var re = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/i;
    try {
      isValid = re.test(phone.trim());
    } catch (e) {
      console.log('Error en is_valid_phone:', e);
    } finally {
      return isValid;
    }
  },

  // Validación de URLs de imágenes
  is_valid_url_image: function (url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    var trimmed = url.trim();

    // Rechazar esquemas peligrosos o caracteres de escape HTML
    if (/[<>"'`\s]/.test(trimmed)) {
      return false;
    }
    if (/^(?:javascript|data|vbscript|file):/i.test(trimmed)) {
      return false;
    }

    // Requiere protocolo HTTP o HTTPS estricto y extensión de imagen soportada
    var re = /^https?:\/\/[^\s<>"'`]+\.(?:jpg|jpeg|png|gif|bmp|webp)(?:\?[^\s<>"'`]*)?$/i;
    try {
      return re.test(trimmed);
    } catch (e) {
      console.log('Error en is_valid_url_image:', e);
      return false;
    }
  },

  // Validación de URLs de videos de YouTube
  is_valid_yt_video: function (url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    var trimmed = url.trim();

    // Rechazar esquemas peligrosos o caracteres de escape HTML
    if (/[<>"'`\s]/.test(trimmed)) {
      return false;
    }
    if (/^(?:javascript|data|vbscript|file):/i.test(trimmed)) {
      return false;
    }

    // Acepta youtube.com/watch?v=ID, youtu.be/ID y youtube.com/embed/ID con ID de 11 caracteres alfanuméricos
    var re = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&][^\s<>"'`]*)?$/i;
    try {
      return re.test(trimmed);
    } catch (e) {
      console.log('Error en is_valid_yt_video:', e);
      return false;
    }
  },

  // Extracción segura del Video ID de YouTube
  getYTVideoId: function (url) {
    if (!this.is_valid_yt_video(url)) {
      return '';
    }
    try {
      var match = url.trim().match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
      return match && match[1] ? match[1] : '';
    } catch (e) {
      return '';
    }
  },

  // Código seguro para incrustar reproductor de YouTube
  getEmbeddedCode: function (url) {
    var id = this.getYTVideoId(url);
    if (!id) return '';
    return '<iframe width="560" height="315" src="https://www.youtube.com/embed/' + id + '" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
  },

  // Etiqueta segura para imagen
  getImageTag: function (url) {
    if (!this.is_valid_url_image(url)) return '';
    var safeUrl = url.trim().replace(/"/g, '&quot;');
    return '<img src="' + safeUrl + '" style="max-height: 400px;max-width: 400px;">';
  },

  // Método principal de saneamiento y clasificación
  validateMessage: function (msg) {
    var defaultResponse = {
      nombre: 'Anonimo',
      mensaje: '',
      color: '#000000',
      tipo: 'text'
    };

    if (!msg) {
      return JSON.stringify(defaultResponse);
    }

    if (typeof msg !== 'string') {
      return JSON.stringify(defaultResponse);
    }

    var obj;
    try {
      obj = JSON.parse(msg);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        obj = { mensaje: String(msg) };
      }
    } catch (e) {
      // Cadena de texto plano o JSON malformado
      return JSON.stringify({
        nombre: 'Anonimo',
        mensaje: this.sanitizeHtml(msg),
        color: '#000000',
        tipo: 'text'
      });
    }

    // Normalización de campos
    var rawMensaje = typeof obj.mensaje === 'string' ? obj.mensaje.trim() : (obj.mensaje != null ? String(obj.mensaje).trim() : '');
    var safeNombre = this.sanitizeName(obj.nombre);
    var safeColor = this.sanitizeColor(obj.color);

    // Detección y clasificación segura
    if (this.is_valid_url_image(rawMensaje)) {
      obj.tipo = 'image';
      obj.url = rawMensaje;
      obj.mensaje = this.getImageTag(rawMensaje);
    } else if (this.is_valid_yt_video(rawMensaje)) {
      var videoId = this.getYTVideoId(rawMensaje);
      obj.tipo = 'video';
      obj.videoId = videoId;
      obj.url = 'https://www.youtube.com/embed/' + videoId;
      obj.mensaje = this.getEmbeddedCode(rawMensaje);
    } else {
      obj.tipo = 'text';
      obj.mensaje = this.sanitizeHtml(rawMensaje);
    }

    obj.nombre = safeNombre;
    obj.color = safeColor;

    return JSON.stringify(obj);
  }

};
