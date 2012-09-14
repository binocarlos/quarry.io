#Pointer
A pointer is a way of referencing a entity on the Internet.

An 'entity' can be a record in a QuarryDB (Mongo) Database - a friend on facebook or anything else that needs 'pointing' to.

There are some things that don't need pointers - things that are 'read-only' do not need pointers.

We only need pointers for things we want to change again later.

So - a pointer:

		{
			// whatever the warehouse needs to get access to the supplier the entity lives in
			// the type not really needed but useful to see
			supplier:{
				type:'quarrydb',
				id:1234
			},

			// the information needed to point to the entity within the supplier above
			// this is usually just an id but can be a whole config object
			target:1234 | {
				some:"data",
				and:"fields"
			}
		}