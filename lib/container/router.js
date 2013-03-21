/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */


/**
 * Module dependencies.
 */

var utils = require('../utils');

module.exports = router;

/*

  quarry.io - router

  functions for working out different strings representing a container on the network

  every container came from a supplier
  this is stamped by the supplier on the way out
  the supplier is saved in:

    meta.quarrysupplier (e.g. /database/user34/4545)

  every container also has a quarryid
  therefore we can do REQREP operations using:

    /database/user34/4545/435345345345345

  as a direct route into any container regardless of where it lives inside the supplier

  then there are portal routes

  these are based on a materialized path representing the route in the container tree

  this is used for portals that listen 'into' points in a container tree

  the materialized path for a container can be anything the supplier decides

  for example - the QuarryDB uses an array of positions - that is the 3rd thing, in the 4th thing, in the 1st thing

  filesystems could use the filepath as the materialized path

  suppliers don't need to worry about uniqueness outside of one database
  that is handled because the path is combined with the supplier route for portals



  
*/

function router(skeleton){
  if(!skeleton){
    return {};
  }

  var containerid = null;
  var portalparts = null;

  if(skeleton.tagname!='supplychain'){
    containerid = skeleton.quarryid;
    portalparts = skeleton.quarryportal;
  }

  return {
    quarrysupplier:function(){
      return skeleton.quarrysupplier;
    },
    quarrydepartment:function(){
      return skeleton.quarrydepartment;
    },
    method:function(method, mode){
      if(!mode){
        mode = 'shallow';
      }
      return this[mode + 'method'].apply(this, [method]);
    },
    shallowmethod:function(method){
      return utils.makeroute([method, this.shallow()], '.');
    },
    deepmethod:function(method){
      return utils.makeroute([method, this.deep()], '.');
    },
    rpc:function(){
      return utils.makeroute([skeleton.quarrydepartment, skeleton.quarrysupplier, containerid]);
    },
    shallow:function(){
      return utils.makeroute([skeleton.quarrydepartment, skeleton.quarrysupplier, containerid], '.');
    },
    deep:function(){
      return utils.makeroute([skeleton.quarrydepartment, skeleton.quarrysupplier].concat(portalparts || []), '.');
    }
  }
}