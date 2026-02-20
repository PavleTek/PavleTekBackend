const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

let s3Client = null;

function getR2Client() {
  if (s3Client) {
    return s3Client;
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in your environment.'
    );
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  s3Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3Client;
}

function getBucketName() {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error('R2_BUCKET_NAME is not set in your environment.');
  }
  return bucket;
}

/**
 * Upload a file to R2.
 * @param {string} key - Object key (e.g. "invoices/42/Invoice_Company_Client_N5_2026-02-20.pdf")
 * @param {Buffer} buffer - File contents
 * @param {string} contentType - MIME type (e.g. "application/pdf")
 * @returns {Promise<void>}
 */
async function uploadFile(key, buffer, contentType = 'application/pdf') {
  const client = getR2Client();
  const bucket = getBucketName();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

/**
 * Retrieve a file from R2.
 * @param {string} key - Object key
 * @returns {Promise<Buffer>}
 */
async function getFile(key) {
  const client = getR2Client();
  const bucket = getBucketName();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Delete a file from R2.
 * @param {string} key - Object key
 * @returns {Promise<void>}
 */
async function deleteFile(key) {
  const client = getR2Client();
  const bucket = getBucketName();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/**
 * Check if a file exists in R2.
 * @param {string} key - Object key
 * @returns {Promise<boolean>}
 */
async function fileExists(key) {
  const client = getR2Client();
  const bucket = getBucketName();

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
}

module.exports = {
  uploadFile,
  getFile,
  deleteFile,
  fileExists,
  getBucketName,
};
