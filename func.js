const fdk=require('@fnproject/fdk');
const process = require('process');
const NoSQLClient = require('oracle-nosqldb').NoSQLClient;
const Region = require('oracle-nosqldb').Region;
const ServiceType = require('oracle-nosqldb').ServiceType;
const url = require('url');

let client;
let lim = 15;

process.on('exit', function(code) {
  if (client) {
     console.log("\close client  on exit");
     client.close();
  }
  return code;
});

fdk.handle(async function(input, ctx){

  let tableName;
  let id;
  let descTable=false;

  // Reading parameters from standard input for TEST purposes
  if (input && input.tableName)
    tableName = input.tableName;

  // Reading parameters sent by the httpGateway
  let hctx = ctx.httpGateway
  if (hctx  && hctx.requestURL) {
        var adr = hctx.requestURL;
        var q = url.parse(adr, true);
        tableName = q.pathname.split('/')[2]
        id = q.pathname.split('/')[3]
        if (id && id == 'desc')
           descTable=true;
        method = hctx.method
        body = ctx.body
  }
  
  if ( !client ) {
    client = createClientResource();
  }
  
  rows = getAllRecords(tableName, q);

  return rows;

}, {});

// Show the structure of the table tablename

async function descTable (tablename) {
   try {
      let resExistingTab = await client.getTable(tablename);
      await client.forCompletion(resExistingTab);
      return resExistingTab
    } catch (err){
        console.error('failed to show tables', err);
        return { error: err };
    } finally {
    }
  });


// Create a new record in the table tablename
async function createRecord (tablename, record) {
    try {
        const result = await client.put(tablename, record, {exactMatch:true} );
        res.json({ result: result});
    } catch (err) {
        console.error('failed to insert data', err);
        return { error: err };
    }
});

// Get a record from the table tablename by id
// Currently the id is hardcoded as key of the table
async function getRecord (tablename, id) {
    try {
        const result = await client.get(tablename, { id })
        res.json(result.row);
    } catch (err) {
        console.error('failed to get data', err);
        return { error: err };
    }
});

// Delete a record from the table tablename by id
// Currently the id is hardcoded as key of the table
async function deleteRecord (tablename, id) {
    try {
        const result = await client.delete(tablename, { id });
        res.json({ result: result});
    } catch (err) {
        console.error('failed to delete data', err);
        return { error: err };
    }
});

// Get all records for the table tablename
async function getAllRecords (tablename, req) {
    let statement = "SELECT * FROM " + tablename;
    const rows = [];
    let offset;

    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const orderby = req.query.orderby;
    if (page)
      console.log (page)
    if (orderby )
      statement = statement + " ORDER BY " + orderby;
    if (limit)
      statement = statement + " LIMIT " + limit;
    if (page) {
      offset = page*limit;
      statement = statement + " OFFSET " + offset;
    }

    console.log (statement)  
    executeQuery (statement)

  });


async function executeQuery (statement) {
  const rows = [];
  let cnt ;
  let res;
  try {
    do {
       res = await client.query(statement, { continuationKey:cnt});
       rows.push.apply(rows, res.rows);
       cnt = res.continuationKey;
    } while(res.continuationKey != null);
  }
  catch(err) {
        return err;
  }
  return rows;
}

function createClientResource() {
  return  new NoSQLClient({
    region: process.env.NOSQL_REGION,
    compartment:process.env.NOSQL_COMPARTMENT_ID,
    auth: {
        iam: {
            useResourcePrincipal: true
        }
    }
  });
}
