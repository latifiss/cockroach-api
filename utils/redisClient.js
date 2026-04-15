const redis = require('redis');
const client = redis.createClient(); 

client.on('error', (err) => console.error('Redis Error:', err));

client.connect(); // for redis@4+

module.exports = client;