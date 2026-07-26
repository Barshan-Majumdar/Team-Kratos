require('dotenv').config();
const ImageKit = require('imagekit');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

async function testUpload() {
  console.log("Starting upload test...");
  try {
    const uploadRes = await imagekit.upload({
      file: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", // 1x1 png base64
      fileName: `test-upload-${Date.now()}`,
      folder: `/test`,
      isPrivateFile: true,
      useUniqueFileName: true
    });
    console.log("Upload successful:", uploadRes);
  } catch (err) {
    console.error("Upload failed:", err);
  }
  console.log("Upload test finished.");
}

testUpload();
