!function ($, $quarry) {

  "use strict"; // jshint ;_;

  var _ = $quarry._;

  var AuthWindow = function (element, options) {
    this.element = $(element);
    this.options = _.defaults(options, {
      container:$quarry.new()
    })
    // the user the window represents
    this.user = this.options.user;
    
    // we do nothing is there is no user!
    if(this.user){
      this.build();  
    }
    
  }

  var templates = $quarry.templates({

    // the list of the users logins
    main:[
  
      '<table class="table table-striped">',
      '</table>'
    ],

    authrow:[
      '<tr>',
        '<td><img src="{{hostname}}/quarry.io/static/icons/social/48x48/{{provider}}.png" border="0" /></td>',
        '<td><span class="label label-success">{{provider}} connected</span></td>',
        '<td><img src="{{account_img}}" align="absmiddle" /> {{account_name}}</td>',
      '</tr>'
    ],


    nonauthrow:[

      '<tr>',
        '<td><a href="/{{action_link}}/{{provider}}"><img src="{{hostname}}/quarry.io/static/icons/social/48x48/{{provider}}.png" border="0" /></a></td>',
        '<td><a href="/{{action_link}}/{{provider}}" class="btn btn-small btn-primary">{{action}} with {{provider}}</a></td>',
      '</tr>'

    ]
  })

  AuthWindow.prototype = {

    constructor: AuthWindow,

    build: function(){

      var $this = this.element;
      var user = this.user;
      var options = this.options;

      var self = this;
      
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('AUTH WINDOW');
      console.log(user);

      
    }
  }

  $.fn.authwindow = function (option, args) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('authwindow')
        , options = typeof option == 'object' && option
      if (!data) $this.data('authwindow', (data = new AuthWindow(this, options)))
      if (typeof option == 'string') data[option](args)
    })
  }

  $.fn.authwindow.Constructor = AuthWindow;

}(window.jQuery, window.quarryio)