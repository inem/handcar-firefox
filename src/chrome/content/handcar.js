// Some code comes from FirePHP project (http://www.firephp.org) and FireLogger project (http://firepython.binaryage.com)

var externalMode = (window.location == "chrome://handcar/content/handcar.xul");

if(externalMode) {
	var detachArgs = window.arguments[0];
	var FBL = detachArgs.FBL;            
	var Firebug = detachArgs.Firebug;
}

FBL.ns(function() { with (FBL) {
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const socketServer = Cc["@mozilla.org/network/server-socket;1"];
  const inputStream = Cc["@mozilla.org/scriptableinputstream;1"];
  const inputStreamPump = Cc["@mozilla.org/network/input-stream-pump;1"];  
  const nsIPrefBranch = Ci.nsIPrefBranch;
  const nsIPrefBranch2 = Ci.nsIPrefBranch2;
  const prefService = CCSV("@mozilla.org/preferences-service;1", "nsIPrefBranch2");
  
  Firebug.HandcarModule = extend(Firebug.Module, {
    server : null,
    panel : null,
    ready_to_fire : false,
    msgs : [],
    contextShowing: 0,
    activeContext: null,
    activeBrowser: null,
    enabled: true,
    
    initialize : function(){
      if(this.isEnabled()) {
        this.start();
      }else{
        var d = document.getElementById("HandcarEnabled")
        d.setAttribute("checked","false");
      }
      window.addEventListener("beforeunload", this.onReload, true);
    },
    
    showContext: function(browser, context) {
      this.activeBrowser = browser;
      this.activeContext = context;
      this.contextShowing++;
    },
    
    onReload : function() {
      Firebug.HandcarModule.ready_to_fire = false;
      Firebug.HandcarModule.msgs = [];
    },

    onToggleOption: function(menuitem) {
      var option = menuitem.getAttribute("option");
      var checked = menuitem.getAttribute("checked") == "true";
      prefService.setBoolPref('extensions.handcar.enabled', checked);
      if(checked) {
        this.start();
      }else{
        this.stop();
      }
    },

    isEnabled: function() {
    
      return prefService.getBoolPref('extensions.handcar.enabled');
    
    },

    showPanel : function(){
      this.ready_to_fire = true;
      for(n in this.msgs) {
        this.say(this.msgs[n],true);
      }
      this.msgs = [];
    },

    start : function() {
      if (this.server){
        this.say("Server already started"); 
        return;
      }
      var listener = {
        onSocketAccepted : function(socket, transport) {
          try {
            var stream = transport.openInputStream(0,0,0);
            var instream = inputStream.createInstance(Ci.nsIScriptableInputStream);
            instream.init(stream);
            var listener = {
              onStartRequest: function(request, context) {
              },
              onStopRequest: function(request, context, status) {
                instream.close();
                instream = null;
              },
              onDataAvailable: function(request, context, inputStream, offset, count) {
                Firebug.HandcarModule.say(instream.read(count),true);
              }
            };
            var pump = inputStreamPump.createInstance(Ci.nsIInputStreamPump);
            pump.init(stream, -1, -1, 0, 0, false);
            pump.asyncRead(listener, null);            
          } 
          catch(ex2){ 
            this.say(ex2); 
          }
        },
        onStopListening: function(serverSocket, status) { }
      };

      try {
        this.server = socketServer.createInstance(Ci.nsIServerSocket);
        this.server.init(2000,true,-1);
        this.server.asyncListen(listener);
      } 
      catch(ex){ this.say(ex); }
    },
    
    stop : function(){
      if (this.server){
        this.server.close();
        this.server = null;
      }else{
        this.say("Server is not started"); 
      }
    },

    say : function(msg,json) {
      if(this.ready_to_fire) {
        if(json) {
          msg = json_parse(msg);
          Firebug.Console.logFormatted([msg.date+' Handcar: '+msg.class,msg.body], this.activeContext, 'log', false, null);
        }else{
          Firebug.Console.logFormatted(['Handcar: ',msg],this.activeContext,'warn',false, null);
        }
      }else{
        this.msgs.push(msg);
      }
    }
  });
  
  Firebug.registerModule(Firebug.HandcarModule);
}});
















