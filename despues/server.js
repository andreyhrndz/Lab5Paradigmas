// Servidor UNA Chat — Express + Socket.IO (despues)

var validation = require('./libs/unalib');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

// Servir la interfaz web del chat y archivos estáticos
app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// Gestión de conexiones en tiempo real vía WebSockets
io.on('connection', function(socket){
  socket.on('Evento-Mensaje-Server', function(msg){
    var validatedMsg = validation.validateMessage(msg);
    // Retransmisión del mensaje validado y saneado a todos los clientes
    io.emit('Evento-Mensaje-Server', validatedMsg);
  });
});

// Iniciar servidor solo si es ejecutado directamente desde CLI
if (require.main === module) {
  http.listen(port, function(){
    console.log('listening on *:' + port);
  });
}

module.exports = { app, http, io };
