#warehouse
a named network resource

a warehouse has a hostname which can be routed to - this will be DNS name of server + id of warehouse

it has a middleware stack so can decide itself how to handle packets

every time containers are loaded - they are scanned for routes

if an alternate route is found - the container is branched and a request sent out to the new route

each warehouse must be able to contact every other warehouse

you can create sub-nets but everywhere must be routable...


##Routes

the routing information might contain different hops


