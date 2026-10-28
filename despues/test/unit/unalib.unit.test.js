const assert = require('assert');
const val = require('../../libs/unalib');

describe('UNA Lib — Pruebas Unitarias de Seguridad y Validación', function () {

  describe('1. Compatibilidad y validación de teléfonos (is_valid_phone)', function () {
    it('debería devolver true para número válido 8297-8547', function () {
      assert.strictEqual(val.is_valid_phone('8297-8547'), true);
    });

    it('debería devolver true para número con código de país +506 8297-8547', function () {
      assert.strictEqual(val.is_valid_phone('+506 8297-8547'), true);
    });

    it('debería devolver false para entrada alfanumérica 8297p-8547', function () {
      assert.strictEqual(val.is_valid_phone('8297p-8547'), false);
    });

    it('debería devolver false para tipos no válidos (null, undefined, objeto)', function () {
      assert.strictEqual(val.is_valid_phone(null), false);
      assert.strictEqual(val.is_valid_phone(undefined), false);
      assert.strictEqual(val.is_valid_phone({}), false);
    });
  });

  describe('2. Validación de URLs de imágenes (is_valid_url_image)', function () {
    it('debería devolver true para http://image.com/image.jpg', function () {
      assert.strictEqual(val.is_valid_url_image('http://image.com/image.jpg'), true);
    });

    it('debería devolver true para http://image.com/image.gif', function () {
      assert.strictEqual(val.is_valid_url_image('http://image.com/image.gif'), true);
    });

    it('debería devolver true para https://secure.com/photo.png', function () {
      assert.strictEqual(val.is_valid_url_image('https://secure.com/photo.png'), true);
    });

    it('debería devolver true para formatos jpeg y webp', function () {
      assert.strictEqual(val.is_valid_url_image('https://media.com/pic.jpeg'), true);
      assert.strictEqual(val.is_valid_url_image('https://media.com/pic.webp'), true);
    });

    it('debería devolver false para protocolos peligrosos como javascript:', function () {
      assert.strictEqual(val.is_valid_url_image('javascript:alert("xss").jpg'), false);
    });

    it('debería devolver false para protocolos data:', function () {
      assert.strictEqual(val.is_valid_url_image('data:image/png;base64,iVBORw0KGgo='), false);
    });

    it('debería devolver false para archivos no de imagen (.html, .exe, .sh, .php)', function () {
      assert.strictEqual(val.is_valid_url_image('https://evil.com/payload.exe'), false);
      assert.strictEqual(val.is_valid_url_image('https://evil.com/page.html'), false);
      assert.strictEqual(val.is_valid_url_image('https://evil.com/script.php'), false);
    });

    it('debería devolver false para inyección de comillas o etiquetas en URL', function () {
      assert.strictEqual(val.is_valid_url_image('https://image.com/pic.jpg" onload="alert(1)'), false);
      assert.strictEqual(val.is_valid_url_image('https://image.com/pic.jpg<script>'), false);
    });

    it('debería devolver false para tipos no string o nulos', function () {
      assert.strictEqual(val.is_valid_url_image(null), false);
      assert.strictEqual(val.is_valid_url_image(undefined), false);
      assert.strictEqual(val.is_valid_url_image(12345), false);
      assert.strictEqual(val.is_valid_url_image(''), false);
    });
  });

  describe('3. Validación de URLs de videos de YouTube (is_valid_yt_video)', function () {
    it('debería devolver true para https://www.youtube.com/watch?v=qYwlqx-JLok', function () {
      assert.strictEqual(val.is_valid_yt_video('https://www.youtube.com/watch?v=qYwlqx-JLok'), true);
    });

    it('debería devolver true para formato corto https://youtu.be/qYwlqx-JLok', function () {
      assert.strictEqual(val.is_valid_yt_video('https://youtu.be/qYwlqx-JLok'), true);
    });

    it('debería devolver true para formato embed https://www.youtube.com/embed/qYwlqx-JLok', function () {
      assert.strictEqual(val.is_valid_yt_video('https://www.youtube.com/embed/qYwlqx-JLok'), true);
    });

    it('debería devolver true para URLs con parámetros adicionales (&t=30s&feature=share)', function () {
      assert.strictEqual(val.is_valid_yt_video('https://www.youtube.com/watch?v=qYwlqx-JLok&t=30s'), true);
    });

    it('debería devolver false para dominios que no son YouTube (vimeo, fakeyoutube)', function () {
      assert.strictEqual(val.is_valid_yt_video('https://vimeo.com/123456789'), false);
      assert.strictEqual(val.is_valid_yt_video('https://fakeyoutube.com/watch?v=qYwlqx-JLok'), false);
      assert.strictEqual(val.is_valid_yt_video('https://www.youtube.com.attacker.com/watch?v=qYwlqx-JLok'), false);
    });

    it('debería devolver false para protocolo javascript: o inyección de etiquetas', function () {
      assert.strictEqual(val.is_valid_yt_video('javascript:alert("xss")'), false);
      assert.strictEqual(val.is_valid_yt_video('https://www.youtube.com/watch?v=qYwlqx<script>'), false);
    });

    it('debería devolver false para tipos no string o vacíos', function () {
      assert.strictEqual(val.is_valid_yt_video(null), false);
      assert.strictEqual(val.is_valid_yt_video(undefined), false);
      assert.strictEqual(val.is_valid_yt_video(''), false);
    });
  });

  describe('4. Extracción de ID de YouTube (getYTVideoId)', function () {
    it('debería extraer correctamente el ID de 11 caracteres de URL estándar', function () {
      assert.strictEqual(val.getYTVideoId('https://www.youtube.com/watch?v=qYwlqx-JLok'), 'qYwlqx-JLok');
    });

    it('debería extraer el ID de URLs cortas youtu.be', function () {
      assert.strictEqual(val.getYTVideoId('https://youtu.be/qYwlqx-JLok'), 'qYwlqx-JLok');
    });

    it('debería extraer el ID de URLs embed', function () {
      assert.strictEqual(val.getYTVideoId('https://www.youtube.com/embed/qYwlqx-JLok'), 'qYwlqx-JLok');
    });

    it('debería retornar cadena vacía o null de forma segura ante URLs no válidas sin lanzar errores', function () {
      assert.strictEqual(val.getYTVideoId('https://invalid.com/test'), '');
      assert.strictEqual(val.getYTVideoId(null), '');
    });
  });

  describe('5. Manejo de entradas malformadas y tipos inesperados en validateMessage', function () {
    it('debería manejar null, undefined y valores booleanos sin lanzar excepción', function () {
      const resNull = JSON.parse(val.validateMessage(null));
      assert.strictEqual(typeof resNull, 'object');
      assert.strictEqual(resNull.mensaje, '');

      const resUndef = JSON.parse(val.validateMessage(undefined));
      assert.strictEqual(typeof resUndef, 'object');

      const resBool = JSON.parse(val.validateMessage(true));
      assert.strictEqual(typeof resBool, 'object');
    });

    it('debería manejar cadenas que no son JSON válido sin propagar errores ni payload peligroso', function () {
      const res = JSON.parse(val.validateMessage('{ esto no es un json valido '));
      assert.strictEqual(typeof res, 'object');
      // No debe contener etiquetas ejecutables
      assert.strictEqual(res.mensaje.includes('<script>'), false);
    });

    it('debería normalizar campos ausentes asignando valores por defecto seguros', function () {
      const payloadSinNombre = JSON.stringify({ mensaje: 'Mensaje sin nombre' });
      const parsed = JSON.parse(val.validateMessage(payloadSinNombre));
      assert.ok(parsed.nombre);
      assert.strictEqual(parsed.mensaje, 'Mensaje sin nombre');
    });

    it('debería validar y sanitizar el color hexadecimal, rechazando inyecciones CSS', function () {
      const payloadCssInjection = JSON.stringify({
        nombre: 'Atacante',
        color: "red; background: url('javascript:alert(1)')",
        mensaje: 'Test'
      });
      const parsed = JSON.parse(val.validateMessage(payloadCssInjection));
      // El color debe ser un hexadecimal seguro (#RRGGBB) o resetearse a valor por defecto
      assert.match(parsed.color, /^#[0-9a-fA-F]{6}$/);
    });

    it('debería sanitizar el nombre de usuario ante intentos de inyección HTML', function () {
      const payloadNombreHtml = JSON.stringify({
        nombre: '<script>alert("xss")</script>Pedro',
        color: '#112233',
        mensaje: 'Hola'
      });
      const parsed = JSON.parse(val.validateMessage(payloadNombreHtml));
      assert.strictEqual(parsed.nombre.includes('<script>'), false);
      assert.strictEqual(parsed.nombre.includes('&lt;script&gt;'), true);
    });
  });

  describe('6. Prevención de Script Injection (XSS) en validateMessage', function () {
    it('debería neutralizar el payload oficial <script>alert("Inyección de script");</script>', function () {
      const payload = JSON.stringify({
        nombre: 'Atacante',
        color: '#FF0000',
        mensaje: "<script>alert('Inyección de script');</script>"
      });
      const resStr = val.validateMessage(payload);
      const res = JSON.parse(resStr);

      assert.strictEqual(res.mensaje.includes("<script>"), false);
      assert.strictEqual(res.mensaje.includes("&lt;script&gt;"), true);
      assert.strictEqual(res.tipo, 'text');
    });

    it('debería neutralizar vectores con manejadores de eventos <img src=x onerror=alert(1)>', function () {
      const payload = JSON.stringify({
        nombre: 'Atacante',
        color: '#FF0000',
        mensaje: '<img src=x onerror=alert(1)>'
      });
      const res = JSON.parse(val.validateMessage(payload));
      assert.strictEqual(res.mensaje.includes('<img'), false);
      assert.strictEqual(res.mensaje.includes('&lt;img'), true);
      assert.strictEqual(res.tipo, 'text');
    });

    it('debería neutralizar vectores con etiquetas svg, iframe y body', function () {
      const vectors = [
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<body onload=alert(1)>'
      ];
      for (const vec of vectors) {
        const payload = JSON.stringify({ nombre: 'X', color: '#000000', mensaje: vec });
        const res = JSON.parse(val.validateMessage(payload));
        assert.strictEqual(res.mensaje.includes('<'), false);
      }
    });

    it('debería neutralizar protocolos javascript: en enlaces o texto', function () {
      const payload = JSON.stringify({
        nombre: 'User',
        color: '#123456',
        mensaje: '<a href="javascript:alert(1)">Click</a>'
      });
      const res = JSON.parse(val.validateMessage(payload));
      assert.strictEqual(res.mensaje.includes('<a'), false);
      assert.strictEqual(res.mensaje.includes('javascript:'), false);
    });
  });

  describe('7. Soporte seguro para URLs multimedia legítimas en validateMessage', function () {
    it('debería reconocer y estructurar de forma segura una URL de imagen válida', function () {
      const payload = JSON.stringify({
        nombre: 'Fotografo',
        color: '#00FF00',
        mensaje: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675.jpg'
      });
      const res = JSON.parse(val.validateMessage(payload));
      assert.strictEqual(res.tipo, 'image');
      assert.strictEqual(res.url, 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675.jpg');
      assert.ok(res.mensaje.includes('max-height: 400px'));
    });

    it('debería reconocer y estructurar de forma segura una URL de video de YouTube', function () {
      const payload = JSON.stringify({
        nombre: 'Cinefilo',
        color: '#0000FF',
        mensaje: 'https://www.youtube.com/watch?v=qYwlqx-JLok'
      });
      const res = JSON.parse(val.validateMessage(payload));
      assert.strictEqual(res.tipo, 'video');
      assert.strictEqual(res.videoId, 'qYwlqx-JLok');
      assert.ok(res.mensaje.includes('https://www.youtube.com/embed/qYwlqx-JLok'));
    });

    it('debería procesar mensajes de texto legítimos sin alterar su legibilidad', function () {
      const payload = JSON.stringify({
        nombre: 'Estudiante',
        color: '#333333',
        mensaje: 'Hola a todos, este es un mensaje normal de bienvenida!'
      });
      const res = JSON.parse(val.validateMessage(payload));
      assert.strictEqual(res.tipo, 'text');
      assert.strictEqual(res.mensaje, 'Hola a todos, este es un mensaje normal de bienvenida!');
    });
  });

});
