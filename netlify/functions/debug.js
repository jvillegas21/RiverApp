exports.handler = async (event, context) => {
  console.log('=== DEBUG FUNCTION CALLED ===');
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));
  console.log('Path:', event.path);
  console.log('HTTP Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers, null, 2));
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Debug function working!',
      event: event,
      timestamp: new Date().toISOString()
    })
  };
}; 