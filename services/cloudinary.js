import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});
// function bufferToStream(buffer) {
//   const readable = new Readable();
//   readable.push(buffer);
//   readable.push(null);
//   return readable;
// }

function bufferToStream(arrayBuffer) {
  const buffer = Buffer.from(arrayBuffer); // <- Aquí convertimos el ArrayBuffer
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

export async function uploadAudioToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video", // Cloudinary handles audio as "video"
        public_id: `quickcard-audios/${filename}`,
        folder: "quickcard-audios",
        format: "mp3",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result?.secure_url || "");
      }
    );

    bufferToStream(buffer).pipe(stream);
  });
}
