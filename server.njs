var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app, { log: false })
  , fs = require('fs')
  ;

var draw;
var reqs = {};
var bandwidth = {
  path: 0,
  full: 0
}


function handler(req, res) {
  if(req.url.toLowerCase() == '/index.html' || req.url.toLowerCase() == '/'){
    fs.readFile(__dirname + '/index.html',
    function (err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading index.html');
      }
      res.writeHead(200);
      res.end(data);
    });
  }else if(req.url.toLowerCase().indexOf('/p.js') >= 0){
    fs.readFile(__dirname + '/p.js',
    function (err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading p.js');
      }
      res.writeHead(200);
      res.end(data);
    });
  }else if(req.url.toLowerCase().indexOf('/imgs/pencil.png') >= 0){
    fs.readFile(__dirname + '/imgs/pencil.png',
    function (err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading pencil.png');
      }
      res.writeHead(200);
      res.end(data);
    });
  }else if(req.url.toLowerCase().indexOf('/imgs/eraser.png') >= 0){
    fs.readFile(__dirname + '/imgs/eraser.png',
    function (err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading eraser.png');
      }
      res.writeHead(200);
      res.end(data);
    });
  }else{
    res.writeHead(404);
    res.end();
  }
}

io.sockets.on('connection', function(socket){
  var time = Date.now();
  reqs[time] = {
    sok : socket,
    waiting : true
  };
    
  if(io.sockets.clients().filter(function(v){return v;}).length > 1){
    socket.broadcast.emit('fullrequest',time);
  }else{
    if(draw){
      socket.emit('draw',draw);
    }
  }
  
  socket.on('pickmeh',function(data){
    if(reqs[data] && reqs[data].waiting){
      reqs[data].waiting = false;
      this.emit('gimmehpng', data);
    }
  });
    
  socket.on('havepng', function(data){
    if(typeof reqs[data.data] !== 'undefined'){
      reqs[data.data].sok.emit('draw',data.dis);
      bandwidth.full += JSON.stringify(data).length;
    }
    draw = data.dis;
    delete reqs[data.data];
  });
  
  socket.on('putitonthefridge', function(data){
    socket.broadcast.emit('draw',data);
    draw = data;
  });
    
  socket.on('drawdatshit', function(data){
    if(data.line && data.line.length > 0){
      socket.broadcast.emit('drawdat',data);
      bandwidth.path += JSON.stringify(data).length;
    }
  });
});

setInterval(function(){console.log('Full: '+bandwidth.full+'\nPath: '+bandwidth.path)},10000)

app.listen(8384);

