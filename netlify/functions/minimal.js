exports.handler = async (event, context) => {
  console.log('Minimal function called');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Minimal function working!',
      path: event.path,
      timestamp: new Date().toISOString()
    })
  };
}; 