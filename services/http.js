const https = require('https');

const requestJson = (url, options = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const status = res.statusCode || 500;
        if (status < 200 || status >= 300) {
          return reject(new Error(`HTTP ${status}: ${data}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
};

module.exports = { requestJson };
