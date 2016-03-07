var ws_chat = require('express')();
var express = require('express');
var http_server = require('http').createServer(ws_chat);
var io = require('socket.io')(http_server);
var fs = require('fs'); /* serve static files */
var chokidar = require('chokidar');

ws_chat.use(express.static(__dirname + '/public'));

ws_chat.use(express.static(__dirname + '/bower_components'));


/* express handles the initial GET request*/
ws_chat.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

/* monitor syslog for changes */
var watcher = chokidar.watch('/var/log/syslog', {
  persistent: true
});

/* socket.io emit/listen events */
io.on('connection', function(socket){
  console.log('web_socket: got connection.\n');
  console.log('web_socket: user connected');

  watcher.on('change', (path, stats) => {
    //if (stats) console.log(`File ${path} changed.`);

    fs.readFile(path, 'utf-8', function(err, log){
      if(err) console.log(`ERROR: ${err}`);
      io.emit('stream-log', log);

    });
  });

  /* listen for incoming chat messages */
  socket.on('chat-messages', function(msg){
    console.log("MSG: " + msg);

    /* emit messages to connected users */
    io.emit('chat-messages', msg);
  });

  socket.on('disconnect', function(){
    console.log('web_socket: user disconnected');
  });
});

/* http listen on specified port */
http_server.listen(3000, function(){
  console.log('server listening on port:3000');
});
