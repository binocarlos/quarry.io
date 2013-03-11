/*

  (The MIT License)

  Copyright (C) 2005-2013 Kai Davenport

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*

	the list of departments within a quarry

	each department represents a section within a joblist

	one worker is able to run all departments (a worker is a process abstraction
	so it does not care what code it is running)
	
	not all departments are required in a joblist

	the required (autocreated) ones are:

		router 					-> HTTP router

		web							-> HTTP server

		reception				-> Quarry router

		switchboard			-> pub/sub
		portal					-> pub/sub

		warehouse				-> Quarry server
			function
			contract
			supplier

	services are then booted on warehouse workers

*/

 module.exports = [

 	/*
 	
 		apply the stack routing table onto HTTP routes
 		back onto the stack

 		the router acts as a caching control proxy over HTTP
 		requests entering a quarry

 		if the request is for a file - the request is ZeroMQ
 		chunked back to the router which is in charge of
 		saving the response

 		this saves us routing any HTTP back to the Quarry
 		suppliers and allows us to route Quarry requests back
 		to them via the reception
 		
 		if the route matches a web:/ url then it is passed on
 		as a HTTP request to the matching web worker
 	*/
 	'router',

 	/*
 	
 		web workers sit just behind the router much like the reception
 		servers

 		they serve websites and applications as dictated by the router
 		
 	*/
 	'web',

 	/*
 	
 		reception workers know about the services available and can route
 		back to them
 		
 	*/
 	'reception',

 	/*
 	
 		the main pub/sub servers for the whole stack

 		it is possible to create other switchboard servers
 		but there is more than enough juice in using routingKeys
 		at the moment

 	*/
 	'switchboard',

 	/*
 	
 		a portal server will keep live listener functions running
 		onto portal and radio routes for the stack

 		this lets users configure the reaction to events around
 		the stack even when they are asleep
 		
 	*/
 	'portal',

 	/*
 	
 		a warehouse server that is able to run code inside of threads

 		the inside thread code is connected to a supply chain on the network
 		
 	*/
 	'code',

 	/*
 	
 		a warehouse server that connects to database to use as an authentication source

 		the users the auth supplier holds can be then questioned and setup with classnems etc
 		for authentication throughout the stack based on that:

 			user.root -> does the current user have the root classname

 			user profile.twitter -> is the current user logged into Twitter

 		the auth middleware on Suppliers will be setup to filter users based on selectors

 		the auth warehouse is where the user header in requests is populated with the users' container
 		to do these selectors against

 		
 	*/
 	'security',

 	/*
 	
 		the provider gives access to the stack into the HQ management interface so the stack
 		can add things like databases and websites and that is representing within the stack
 		project and so things like billing and usage can be tracked from the top level
 		
 	*/
 	'provider',

 	/*
 	
 		a warehouse server that can resolve a contract tree and accept loopbacks
 		onto its holdingbay
 		
 	*/
 	'contract',

 	/*
 	
 		the various warehouse suppliers that quarry.io supports
 		
 	*/
 	'supplier'

];

/*

	how many of each job will be initially sparked
	
*/
module.exports.allocation = {
	'router':1,
 	'reception':1,
 	'switchboard':1,
 	'contract':1,
 	'code':1,
 	'portal':1
}

/*

	which jobs should be booted first because they bind endpoints
	
*/
module.exports.bootfirst = {
 	'reception':1,
 	'switchboard':1
}