var pages = require('./routes/pages');
var markdown = require('./routes/markdown');
var quarry = require('./routes/quarry');
var express = require('express');

module.exports = function(app) {
  
  /*
		Homepage
   */

  var indexroute = pages.index();
  app.get('/', indexroute);
  app.get('/index.htm', indexroute);
  app.get('/index.html', indexroute);

  /*
    The entry point for the API
   */
  app.get('/quarry.io.js', quarry.boot());
  app.get('/quarry.io.container.js', quarry.symlink());

  /*
    Core
    Libs
    Icons
   */
  app.use('/resources', express.static(__dirname+'/../../../resources/web'));

  /*
    Flag the session with no more 'connecting' of accounts
   */
  app.get('/usr/start', function(req, res){
    req.user.started = true;
    req.session.save();

    res.json({
      ok:true
    })
  })


  /*
		Catch all .md filter
   */


  app.use(markdown.page({
  	document_root:__dirname+'/www'
  }))


}