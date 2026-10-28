// Servidor UNA Chat — Express + Socket.IO (despues)

var validation = require('./libs/unalib');
var path = require('path');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

// Servir la interfaz web del chat y archivos estáticos (permitiendo rutas en carpetas de worktree)
app.use(express.static(path.resolve(__dirname, 'public'), { dotfiles: 'allow' }));
app.get('/', function(req, res){
  res.sendFile(path.resolve(__dirname, 'index.html'), { dotfiles: 'allow' });
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
