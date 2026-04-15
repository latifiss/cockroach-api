const https = require('https');

// Function to fetch raw XML
const fetchRawRSS = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
};

// Fetch and display raw XML
(async () => {
  try {
    const rssUrl = 'https://ghananewsprime.com/feed/';
    console.log(`Fetching raw XML from ${rssUrl}...`);

    const rawXML = await fetchRawRSS(rssUrl);
    console.log('\nRAW XML RESPONSE:\n');
    console.log(rawXML);

    // Save to file for inspection
    const fs = require('fs');
    fs.writeFileSync('rt_raw.xml', rawXML);
    console.log('\nSaved to rt_raw.xml');
  } catch (error) {
    console.error('Error fetching raw XML:', error);
  }
})();
