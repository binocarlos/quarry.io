!function ($, $quarry) {

  "use strict"; // jshint ;_;

  var _ = $quarry._;

  var UserBar = function (element, options) {
    this.element = $(element);
    this.options = _.defaults(options, {
      container:$quarry.new()
    })
    // check for the container api
    this.user = this.options.user;
    
    // we do nothing is there is no user!
    if(this.user){
      this.build();  
    }
    
  }

  var templates = $quarry.templates({

    // the user bar with projects list and trigger

    main:[

            '<p class="navbar-text pull-right" style="font-size:.8em;">',
              'Logged in as <a class="navbar-link" id="displayname" href="#authModal" data-toggle="modal">{{user_name}}</a>',
            '</p>',

            '<ul class="nav pull-right">',
              '<li class="dropdown" id="fat-menu">',
                '<a data-toggle="dropdown" class="dropdown-toggle" role="button" id="drop3" href="#">{{current_project_name}} <b class="caret"></b></a>',
                '<ul aria-labelledby="drop3" role="menu" class="dropdown-menu">',

                  '{{#projects}}',
                    '<li><a href="#" class="project_link" data-index="{{index}}" tabindex="-1">{{name}}</a></li>',
                  '{{/projects}}',

                  '<li class="divider"></li>',
                  '<li><a href="#" tabindex="-1">Add project</a></li>',
                '</ul>',
              '</li>',
            '</ul>'
    ]
  })

  UserBar.prototype = {

    constructor: UserBar,

    build: function(){

      var $this = this.element;
      var user = this.user;
      var options = this.options;

      var self = this;
      
      var projects = user.projects || [];
      var current_project = projects[user.current_project_index];
      var current_project_name = current_project ? current_project.name : '';

      $this.html(templates.render('main', {
        user_name:user.name,
        current_project_name:current_project_name,
        projects:_.map(projects, function(project, index){
          project.index = index;
          return project;
        })
      }))

    }
  }

  $.fn.userbar = function (option, args) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('userbar')
        , options = typeof option == 'object' && option
      if (!data) $this.data('userbar', (data = new UserBar(this, options)))
      if (typeof option == 'string') data[option](args)
    })
  }

  $.fn.userbar.Constructor = UserBar;

}(window.jQuery, window.quarryio)