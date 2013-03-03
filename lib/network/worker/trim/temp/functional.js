
        trim.mapserver = MapThreadServer({
          id:spark.attr('stackid') + ':map',
          supplychain:trim.supplychainclient,
          worker:worker
        })

        supplychainserver.use(mapserver);

        mapserver.listen(next);