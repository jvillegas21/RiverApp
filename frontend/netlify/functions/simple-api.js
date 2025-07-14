exports.handler = async function(event, context) {
  console.log('Simple API function called:', event.path);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
    },
    body: JSON.stringify({
      message: 'Simple API is working!',
      path: event.path,
      method: event.httpMethod,
      timestamp: new Date().toISOString()
    })
  };
}; 