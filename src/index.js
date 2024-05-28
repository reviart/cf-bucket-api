const { Hono } = require('hono');
const { AwsClient } = require('aws4fetch');
const { parseString } = require('xml2js');

const app = new Hono();

// Get files inside bucket
app.get('/buckets/:bucketName', async (c) => {
  const {
    bucketName,
  } = c.req.param();

  const {
    accountId,
    bucketAccessKey,
    bucketSecretAccessKey,
  } = c.env;

  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}`;
  const client = new AwsClient({
    accessKeyId: bucketAccessKey,
    secretAccessKey: bucketSecretAccessKey,
  });
  const buckets = await client.fetch(url);
  const bucketsXml = await buckets.text();

  if (!bucketsXml || bucketsXml.toLowerCase().includes('nosuchbucket')) {
    const code = 404;
    return c.json({
      code,
      message: 'Bucket not found!',
    }, code);
  }

  let result;
  parseString(bucketsXml, (err, res) => {
    result = res;
  });

  return c.json(result);
});

// Get image / file without encryption (not secure)
app.get('/buckets/:bucketName/:fileName', async (c) => {
  const {
    bucketName,
    fileName,
  } = c.req.param();

  const {
    accountId,
    bucketAccessKey,
    bucketSecretAccessKey,
  } = c.env;

  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${fileName}`;
  const client = new AwsClient({
    accessKeyId: bucketAccessKey,
    secretAccessKey: bucketSecretAccessKey,
  });
  const objectResponse = await client.fetch(url);

  if (!objectResponse.ok) {
    const code = 404;
    return c.json({
      code,
      message: 'File not found!',
    }, code);
  }

  // Get the binary data from the response
  const arrayBuffer = await objectResponse.arrayBuffer();

  // Set appropriate headers
  const headers = {
    'Content-Type': objectResponse.headers.get('Content-Type'),
    'Content-Length': objectResponse.headers.get('Content-Length'),
  };

  // Return the image data with the correct MIME type
  return c.body(arrayBuffer, 200, headers);
});

export default app;
