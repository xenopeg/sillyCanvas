/***
  This thingy uses:
    Spectrum (to replace color input on firefox) 
     -> http://bgrins.github.io/spectrum/
    jQuery (because pure JavaScript is hardcore-mode and I'd like to keep some sanity)
     -> http://jquery.com/
    socket.io (because intrerwebs)
     -> http://socket.io/
    Node.js (foh dem server)
     -> http://nodejs.org/
*/
(function(){
  // setup functions
  function loadColor(){
    var a = document.createElement('input');
    try{ 
      a.type ='color';
    }catch(e){
      a.type ='text';
    }
    if(a.type == 'text'){
      $('head').append('<link rel="stylesheet" href="http://cdn.jsdelivr.net/jquery.spectrum/1.1.1/spectrum.css" />');
      $.getScript('http://cdn.jsdelivr.net/jquery.spectrum/1.1.1/spectrum.js');
    }
  }

  function loadScripts(){
    loadjQuery(loadColor);
  }

  function loadjQuery(callback){
    if(typeof jQuery === 'undefined'){
      var script = document.createElement("script");
      script.src = "http://ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min.js";
      script.type = "text/javascript";
      document.getElementsByTagName("head")[0].appendChild(script);
      $(callback);
    }else{
      callback();
    }
  }
  loadScripts();
})()
function sillyCanvas(elm, sok){
  var sok = sok;
  function loadURItoCanvas(context, uri){
    var img = new Image;
    img.onload = function(){
      var tmpComp = context.globalCompositeOperation;
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img,0,0);
      context.globalCompositeOperation = tmpComp;
    };
    img.src = uri;
  }        

  function ToolBelt(cntx){
    var context = cntx;
    var _this = this;
    var tools = {};
    var toolList = [];
    var currentTool;
    
    this.getCurrent =
    function getCurrent(){
      return currentTool;
    }
    
    this.addTool = 
    function addTool(id, name, tool){
      tools[id] = {};
      tools[id].name = name;
      tools[id].tool = tool;
      toolList.push(id);
      if(toolList.length > 10){
        delete tools[toolList.unshift()];
      }
      currentTool = (id);
    }
    
    this.pickTool =
    function pickTool(id){
      toolList.push(toolList.splice(toolList.indexOf(id),1)[0]);
      currentTool = (id);
    }
    
    this.popTool =
    function popTool(){
      toolList.pop();
      currentTool = (toolList[toolList.length-1].id);
    }
    
    this.handler =
    function handler(ev){
      if(ev.type == 'mousedown')
      if(
        $('#option_colorpick').val() !== tools[currentTool].tool.getOpts().fillStyle 
        || $('#option_colorpick').val() !== tools[currentTool].tool.getOpts().strokeStyle 
        || $('#option_sizepick').val() !== tools[currentTool].tool.getOpts().lineWidth 
        || $('.tool.selected').attr('value') !== tools[currentTool].tool.getOpts().globalCompositeOperation 
      ){
        _this.addTool(
          Date.now(),
          $('.tool.selected').attr('name'),
          new Pencil(
            context, 
            {
              globalCompositeOperation: $('.tool.selected').attr('value'),
              fillStyle: $('#option_colorpick').val(),
              strokeStyle: $('#option_colorpick').val(),
              lineWidth: $('#option_sizepick').val(),
              lineCap : 'round'
            }
          )            
        );
      }
      tools[currentTool].tool.handler(ev);
    }
  }

  function Pencil(cntx, opts, untimed){
    var context = cntx;
    var drawing = false;
    var _this = this;
    var opts = opts;
    var line = [];
    var time;
    var lastUpd = 0;
    var drawInterval = untimed ? 0 : 10;
    
    this.getOpts =
    function getOpts(){
      return opts;
    }
    
    this.start = 
    function start(x,y){
      if(typeof opts !== 'undefined'){
        Object.keys(opts).forEach(function(v){
          context[v] = opts[v];
        });
      }
      drawing = true;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x+0.1, y+0.1);
      context.stroke(); 
      context.closePath();   
      //context.moveTo(x, y);   
      line=[];
      line.push([x,y]);
    }
    this.move = 
    function move(x,y, nodraw){
      if(!nodraw){
        time = Date.now()
        if( lastUpd + drawInterval <= time ){     
        
          context.beginPath();
          
            context.moveTo(line[line.length-1][0], line[line.length-1][1]);  
          
            line.push([x,y]);     

            context.lineTo(x, y);
            context.stroke();    
            lastUpd = time;
            
          context.closePath();  
          
        }
      }else{
        line.push([x,y]);     
      }
    }
    this.stop = 
    function stop(x, y, nodraw){       
      drawing = false;
      if(!nodraw){
        context.beginPath();
        context.lineTo(x, y);
        line.push([x,y]);
        context.stroke();
        context.closePath(); 
      }         
    }
    this.handler = 
    function(ev){ 
      var offsetX = ev.offsetX || ( ev.pageX - $(ev.target).offset().left );
      var offsetY = ev.offsetY || ( ev.pageY - $(ev.target).offset().top );
      if(ev.button === 2)return;
      switch(ev.type){
        case 'mousedown':
          _this.start(offsetX,offsetY);
          ev.preventDefault();
          //ev.stopPropagation()
          break;
        case 'mouseleave':
        case 'mousemove':
          if(drawing ) if( ev.which == 1){ 
            _this.move(offsetX,offsetY);
          }else {
            drawing && _this.stop(offsetX,offsetY);
            socket.emit('drawdatshit',{line:line,tool:opts});
          }
          break;
        case 'mouseenter':
          if(drawing){
            if(ev.which !== 1) {
              _this.stop(offsetX,offsetY, true);
              socket.emit('drawdatshit',{line:line,tool:opts});
            }else{
              _this.move(offsetX,offsetY, true);
            }
          }
          break;
        case 'mouseup':
          drawing && _this.stop(offsetX,offsetY);
          socket.emit('drawdatshit',{line:line,tool:opts});
          break;
      }
    }
  }
      
  var $elm = $(elm);
  var width = $elm.width()-22;
  var height = $elm.height()-34;
  var node = document.createElement('div');
  var $node = $(node);
  var socket;
  
  var link;
  if(sok){
    if(sok.indexOf('http://') === 0){
      link = sok+(sok[sok.length-1]==='/'?(''):('/'))
    }else{
      link = 'http://'+sok+(sok[sok.length-1]==='/'?(''):('/'))
    }
  }else{
    link = './';
  }
    
  var css 
    = '#drawcontainer *{ border-spacing: 0px; -moz-box-sizing: border-box; box-sizing: border-box; padding: 0px;}'
    + '#draw{'
    + '  float: left;border-width: 1px;border-style: solid;border-color: black;width:'+(+width+2)+'px;height:'+(+height+2)+'px;'
    + '}'
    + '#drawarea{'
    + '  width:'+width+'px;height:'+height+'px;'
    + '}'
    + '.tool{'
    + '  padding: 1px;margin: 3px;width:22px;height:22px;float:left;display: inline-block;border-width: 1px;border-style: solid; border-color: black;'
    + '}'
    + '.option{'
    + '  padding: 1px;height:24px;width:40px;float:left;display: inline-block;border-width: 1px;border-style: solid;border-color: black;'
    + '}'
    + '#options{'
    + '  padding: 2px;margin: 0px;float:left;display: inline-block;'
    + '}'
    + '#toolbelt{'
    + '  float: left;width:18px;height:'+(+height+2)+'px;border-width: 1px;border-style: solid;border-color: black;'
    + '} '
    + '.tool.selected{'
    + '  background-color: #DDDDDD;'
    + '}      '
    + '#toolsettings{'
    + '  width:'+(+width+20)+'px;height:30px;border-width: 1px;border-style: solid;border-color: black;'
    + '}'    
    + '#overlayalpha{'
    + '  position:absolute;bottom:0px;right:0px;opacity:0.3;'
    + '}'
    + '#overlayalpha:hover{'
    + '  opacity: 0.7;'
    + '}'
    + '#tool_pencil{'
    + '  background-image:url('+link+'imgs/pencil.png);'
    + '}'
    + '#tool_eraser{'
    + '  background-image:url('+link+'imgs/eraser.png);'
    + '}'
    + '#drawarea:active, #drawarea:focus{'
    + '  cursor: crosshair;'
    + '}';
    
  var html
    = '<div id="drawcontainer" style="position:relative;display:block;border:1px solid black;min-width:'+(+width+20)+'px;">'
    + '  <div id="drawthingy" style="display:inline-block;">'
    + '    <div id="toolsettings" style="position:relative;background-color: rgba(200,200,200,0.70);">'
    + '      <div id="tool_pencil" class="tool selected" name="pencil" value="source-over">'
    + '      </div>'
    + '      <div id="tool_eraser" class="tool" name="eraser" value="destination-out">'
    + '      </div>'
    + '      <div id="paintcolors" style="line-height: 0;margin:2px;float:left;height:12px;display:inline-block;"></div>'
    + '      <div id="options">'
    + '        <div style="float:left"><input class="option" id="option_colorpick" type="color" /></div>'
    + '        <input class="option" id="option_sizepick" type="number" value="2" />'
    + '      </div>'
    + '      <div id="paintrange" style="margin:2px;float:left;height:12px;display:inline-block;">'
    + '        <input type="range" min="1" max="100" value="2" style="width:100px;" />'
    + '      </div>'
    + '      <input id="overlayalpha" type="range" min="0" max="50" value="0" style="width:100px;" />'
    + '    </div>'
    + '    <div id="draw">'
    + '      <canvas id="drawarea" width="'+width+'" height="'+height+'"/>'
    + '    </div>'
    + '    <div id="toolbelt">'
    + '    </div>'
    + '  </div>'
    + '  <button id="drawtoggle" style="background-color:#DDDDDD;width:18px;height:18px;border:2px solid black;position:absolute;bottom:0px;right:0px">-'
    + '  </button>'
    + '</div>';
    
  var colors = [
    '000000','DD33D5','4A1096','D6D6D6','FF8132','FFDF2B','44D3ED','192F75','FF0000','00FF1D',
    'FFFFFF','FF82F2','A752D8','E6E6E6','FF9532','FFEF7A','6AE6ED','2C5EFF','F07272','79D484'
  ];  
  
  
  $node.css({
    'position': 'absolute',
    'top': $elm.offset().top+'px',
    'left': $elm.offset().left+'px',
    'width': $elm.width()+'px',
    'height': $elm.height()+'px',
    'z-index': 30
  });
  
  $('body').append(node);
  
  $('head').append('<style>'+css+'</style>');

  $node.html(html);

  if(typeof $().spectrum != 'undefined' ) {
    $("#option_colorpick").spectrum({
      preferredFormat: "hex6",
      showButtons: false,
      showInput: true,
      color: "#000000"
    });
    function setColorPicker(val){
      $("#option_colorpick").spectrum("set", val);
    }
  }else{
    function setColorPicker(val){
      $("#option_colorpick").val(val);
    }
  }
  
  $('#paintcolors').html(
    colors.map(function(v){
      return (
          '<button value='+v+' style="border:1px solid black;background-color:#'+v+';width:12px;height:12px;">'
        + '</button>'
      );
    })
  ).css({
    'width': Math.ceil(colors.length/2)*12+'px'
  });  
  $('#paintrange > input').change(function(ev){
    $('#option_sizepick').val($(this).val());
  });
  $('#overlayalpha').change(function(ev){
    $('#drawcontainer').css({
      'background-color': 'rgba(200,200,200,'+($(this).val()/100)+')'
    });
  });
  $('#paintcolors > button').click(function(ev){
    setColorPicker('#'+$(this).val());
  });
  
  
  var tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = width;
  tmpCanvas.height = height;
  var tmpContext = tmpCanvas.getContext('2d');

  canvas = $('#drawarea')[0];
  var context = canvas.getContext('2d');
  tools = new ToolBelt(context);
  tools.addTool(
    1,
    'pencil',
    new Pencil(
      context, 
      {
        globalCompositeOperation:"source-over",
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 3,
        lineCap : 'round'
      }
    )
  );
  tools.addTool(
    2,
    'eraser',
    new Pencil(
      context, 
      {
        globalCompositeOperation:"destination-out",
        fillStyle: '#FFFFFF',
        strokeStyle: '#FFFFFF',
        lineWidth:10,
        lineCap : 'round'
      }
    )
  );
  tools.pickTool(1);
  $('#drawarea').on('mousedown mousemove mouseup mouseleave mouseenter', tools.handler);

  $('#drawarea').on('contextmenu',function(ev){
    if(tools.getCurrent() == 2){
      tools.pickTool(1);
    }else{
      tools.pickTool(2);
    }
    ev.preventDefault();
    return false;
  });     
  
  var socket;
  if(typeof io === 'undefined'){
    var url = link+'socket.io/socket.io.js';
  
    $.getScript(url,setupSocket);
  }else{
    setupSocket();
  }window.setupSocket = setupSocket;
  function setupSocket(){
    console.log('c:')
    socket = io.connect(sok);    
    socket.on('fullrequest', function(data){
      socket.emit('pickmeh',data);
    });        
    socket.on('gimmehpng', function(data){
      socket.emit('havepng',{data:data,dis:canvas.toDataURL()});
    });
    
    socket.on('draw', function(data){
      loadURItoCanvas(context, data);
    });
    
    socket.on('drawdat', function(data){
      
      var tmpComp = context.globalCompositeOperation;
      context.globalCompositeOperation = data.tool.globalCompositeOperation;
      data.tool.globalCompositeOperation = 'source-over';
      var tool = new Pencil(
        tmpContext, 
        data.tool,
        true
      );
      
      tmpContext.clearRect ( 0 , 0 , width , height );
      
      tool.start(data.line[0][0],data.line[0][1]);
      for(var i=1 ; i<data.line.length-1 ; i++){
        tool.move(data.line[i][0],data.line[i][1]);
      }
      tool.stop(data.line[i][0],data.line[i][1]); 
      
      context.drawImage(tmpCanvas, 0, 0);
      context.globalCompositeOperation = tmpComp;
    });
    
    $('#drawtoggle').click(function(ev){
      var dt = $('#drawthingy');
      if(dt.is(':visible')){
        dt.slideUp({complete:function(){
          socket.disconnect();
          context.clearRect ( 0 , 0 , width , height );
          $node.css({
            'pointer-events':'none'
          });
        }});
      }else{
        dt.slideDown();
        socket.socket.connect();
        $node.css({
          'pointer-events':'auto'
        });
      }
    }).css({
      'pointer-events':'all'
    });
  }
  
  $('.tool').click(function(ev){
    $('.tool').removeClass('selected');
    $(this).addClass('selected');
  });
  
  

};
