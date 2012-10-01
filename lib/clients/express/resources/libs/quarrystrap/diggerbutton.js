!function ($, $quarry) {

  "use strict"; // jshint ;_;

  var _ = $quarry._;

  var DiggerButton = function (element, options) {
    this.element = $(element);
    this.options = _.defaults(options, {
      container:$quarry.new()
    })
    // check for the container api
    this.container = this.options.container;
    
    this.build();
  }

  var templates = $quarry.templates({

    // the main button wrapper

    main:[
'<div class="btn-group">',
  '<a class="btn dropdown-toggle btn-small btn-primary" data-toggle="dropdown" href="#">',
    '<span id="button_title">{{name}}&nbsp;</span>',
    '<span class="caret"></span>',
  '</a>',
  '<ul class="dropdown-menu" id="main_dropdown">',
  '</ul>',
'</div>'
    ],

    // a single container

    item:[
      '<li>',
        '<a tabindex="-1" href="#">',
          '{{name}}',
        '</a>',
      '</li>'
    ]
  })

  DiggerButton.prototype = {

    constructor: DiggerButton,

    build: function(){

      var $this = this.element;
      var container = this.container;
      var options = this.options;

      var self = this;

      $this.html(templates.render('main', {
        name:this.options.name
      }))

      var main_dropdown = $this.find('#main_dropdown');

      // this is a container
      if(this.options.default){
        main_dropdown.append(self.buildMenuItemFromContainer(this.options.default));
        main_dropdown.append($('<li class="divider"></li>'));
      }

      // load the root elements and build drop down item for them
      this.container('> *:tree').each(function(result){
        main_dropdown.append(self.buildMenuItemFromContainer(result));
      })

      
    },

    buildMenuItemFromContainer: function(container){
    
      var $this = this.element;
      var self = this;
      var li = $(templates.render('item', container));
      var a = li.find('a');

      // sub menu
      if(container.count()>0){

        var ul = $('<ul></ul>')
          .addClass('dropdown-menu');

        container.each(function(child){
          ul.append(self.buildMenuItemFromContainer(child));
        })

        li
          .addClass('dropdown-submenu')
          .append(ul);
      }

      a.data('container', container);

      a.click(function(){
        $this.trigger('container', container);
      })

      return li;
    }
  }

  $.fn.diggerbutton = function (option, args) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('diggerbutton')
        , options = typeof option == 'object' && option
      if (!data) $this.data('diggerbutton', (data = new DiggerButton(this, options)))
      if (typeof option == 'string') data[option](args)
    })
  }

  $.fn.diggerbutton.Constructor = DiggerButton;

}(window.jQuery, window.quarryio)