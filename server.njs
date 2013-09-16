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
  var link = req.url.split('/');
  console.log(link[1]);
  var content;
  switch(link[1]){
    case 'sillyCanvas.js':
      content = fs.readFileSync('sillyCanvas.js').toString();
      res.writeHead(200, {'Content-Type': 'application/javascript'});
      break;
    case 'imgs':
      switch(link[2]){        
        case 'eraser.png':
          content = fs.readFileSync('imgs/eraser.png');
          res.writeHead(200, {'Content-Type': 'image/png'});
          break;
        case 'pencil.png':
          content = fs.readFileSync('imgs/pencil.png');
          res.writeHead(200, {'Content-Type': 'image/png'});
          break;
        default:
          content = '';
          res.writeHead(404);
          break;
      }
      break;    
    default:
      content = fs.readFileSync('index.html').toString();
      res.writeHead(200, {'Content-Type': 'text/html'});
      break;
  }
  res.end(content);
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

