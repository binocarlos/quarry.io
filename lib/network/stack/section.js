/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/**
 * Module dependencies.
 */
var flavours = {
  'base':require('./section/proto'),
  'apiserver':require('./section/apiserver')
}

/*

  quarry.io - stack section

  a flavour within a stack

  represents stack endpoints and the instances we have to run them on

  each instance we are given we create a worker and then decide
  how to re-allocate

  
*/

module.exports = factory;

function factory(type, options){

  var SectionClass = flavours[type] ? flavours[type] : flavours.base;

  return new SectionClass(options);
}