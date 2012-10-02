!function ($, $quarry) {

  "use strict"; // jshint ;_;

  var _ = $quarry._;

  var templates = $quarry.templates({

    // the main form with tabs

    main:[
      '<div class="tabbable">',
        '<ul id="tabnav" class="nav nav-tabs">',
          
        '</ul>',
        '<form class="form-horizontal">',
          '<fieldset>',
            '<div id="tabcontent" class="tab-content">',
              
            '</div>',
          '</fieldset>',
        '</form>',
      '</div>'
    ],

    selector:[
      '<form class="form-inline">',
        '<div style="font-size:1.2em;font-weight:bold;text-align:center;">',
          '<span>&lt;&nbsp;</span>',
          '<input type="text" class="input-small selector-tagname">',
          '<span> id="</span>',
          '<input type="text" class="input-small selector-id" placeholder="#id">',
          '<span>" class="</span>',
          '<input type="text" class="input-medium selector-classnames" placeholder=".classname">',
          '<span>" /&gt</span>',
        '</div>',
      '</form>'
    ],

    tablink:'<li><a href="#{{id}}">{{title}}</a></li>',

    tabpane:'<div class="tab-pane" id="{{id}}"></div>',

    wrapper:[
      '<div class="control-group">',
        '<label class="control-label" for="{{id}}">{{title}}</label>',
        '<div class="controls">',
          
        '</div>',
      '</div>'
    ]

  })

  /*
    For labels
   */

  function ucwords(str){
    return (str + '').replace(/^([a-z])|\s+([a-z])/g, function ($1) {
        return $1.toUpperCase();
    });
  }

  /*
    combine the quarryid and field name
   */
  function get_field_id(field_name, container){
    return container.quarryid() + ':' + field_name;
  }

  /*
    auto wrap in label horizontal style
   */

  function field_wrapper(elem, options){

    options || (options = {})

    var ret = $(templates.render('wrapper', options));

    if(elem){
      ret.find('.controls').append(elem);
    }

    return ret;
  }

  /*
    basic text field without wrapper
   */

  function text_field(options){
    options || (options = {})
    var elem = $('<input />');

    elem
      .attr({
        'type':'text',
        'placeholder':options.placeholder || ''
      })
      .val(options.value);
      
    return elem;
  }

  /*
    compact form with tagname, id & classnames
   */

  function selector(field, container){
    var elem = $(templates.render('selector'));

    container.bind_dom(elem.find('.selector-tagname'), {
      field:'_meta.tagname',
      auto_event:'change'
    })

    container.bind_dom(elem.find('.selector-id'), {
      field:'_meta.id',
      auto_event:'change'
    })

    container.bind_dom(elem.find('.selector-classnames'), {
      field:'_meta.classnames', 
      datasource:function(val){
        if(val){
          var new_classnames = {};
          _.each(val.split(/\s+/), function(c){
            new_classnames[c] = true;
          })
          this.classnames(new_classnames);
        }
        return _.keys(this.classnames()).join(' ');
      }
    })

    return elem;
  }

  function legend(field, container){
    return $('<legend>' + field.title + '</legend>');
  }

  function text(field, container){
    var field_id = get_field_id(field.field, container);

    var field_elem = text_field({
      value:container.attr(field.field)
    }).attr({
      id:field_id
    })

    return field_wrapper(field_elem, {
      id:field_id,
      title:field.title
    })
  }

  var QuarryForm = function (element, options) {

    this.element = $(element);
    this.options = _.defaults(options, {
      container:$quarry.new()
    })
    // check for the container api
    this.container = this.options.container;

    this.build();
  }

  QuarryForm.prototype = {

    constructor: QuarryForm,

    renderers:{

      legend:legend,

      selector:selector,

      text:text

    },

    build: function(){

      var $this = this.element;
      var container = this.container;
      var options = this.options;

      var self = this;

      $this.html(templates.render('main'));

      var blueprint = container.blueprint();

      // the standard tab layout
      var main_tab = {
        type:'tab',
        active:true,
        title:'Main',
        fields:[{
          type:'selector'
        }]
      }

      var description_tab = {
        type:'tab',
        title:'Description',
        fields:[{
          field:'description',
          type:'textarea'
        }]
      }

      var icon_tab = {
        type:'tab',
        title:'Icon',
        fields:[{
          field:'icon',
          type:'image'
        }]
      }

      var tabs = [main_tab, description_tab, icon_tab];

      // now map in the blueprint onto tabs/attributes tab
      _.each(blueprint.fields(), function(field){
        if(field.type=='tab'){
          tabs.push(field);
        }
        else{
          main_tab.fields.push(field);
        }
      })

      _.each(tabs, _.bind(this.build_tab, this));

      $this.find('#tabnav a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
      })
    
    },

    /*
      Build up a single tab with fields on
    */
    build_tab: function(tab, index){

      var self = this;
      var $this = this.element;
      var container = this.container;

      // now loop over and build the tabs
      var tabnav = $this.find('#tabnav');
      var tabcontent = $this.find('#tabcontent');

      var link_div = $(templates.render('tablink', {
        title:tab.title,
        id:index
      }))

      var tab_div = $(templates.render('tabpane', {
        title:tab.title,
        id:index
      }))

      if(index==0){
        link_div.addClass('active');
        tab_div.addClass('active');
      }

      // now loop the fields and build them up
      _.each(tab.fields, function(field){
        tab_div.append(self.build_field(field));
      })

      tabnav.append(link_div);
      tabcontent.append(tab_div);

    },

    /*
      Build up a single field on a tab
     */
    build_field: function(field){
      var $this = this.element;
      var container = this.container;

      field.type || (field.type='text');

      if(!field.title){
        field.title = field.field || '';
      }

      field.title = ucwords(field.title.replace(/[_\.]/g, ' '));

      var renderer = this.renderers[field.type] || this.renderers.text;

      return renderer.apply(this, [field, container]);;
    }


  }

  $.fn.quarryform = function (option, args) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('quarryform')
        , options = typeof option == 'object' && option
      if (!data) $this.data('quarryform', (data = new QuarryForm(this, options)))
      if (typeof option == 'string') data[option](args)
    })
  }

  $.fn.quarryform.Constructor = QuarryForm;

}(window.jQuery, window.quarryio)