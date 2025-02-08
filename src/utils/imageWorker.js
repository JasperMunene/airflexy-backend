import dotenv from 'dotenv';
import cloudinary  from 'cloudinary';
import { supabase } from "../config/supabaseConfig.js";
import { Queue, Worker } from "bullmq";
import path from "path";
import fs from "fs/promises";
dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

// Configure the queue with your Redis settings
const queue = new Queue("image-upload", {
  connection: { 
    url: REDIS_URL,
    tls: {
      rejectUnauthorized: false
    } 
   },
  
});




// Function to upload an image and insert the URL into the images table
const uploadToCloudinary = async (imagePath, userId, propertyId) => {
  // Verify that the user exists
  const { data: user, error: userError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (userError || !user) {
    console.warn("Job removed: User not found.");
    return;
  }

  try {
    // Resolve the absolute path in case the imagePath is relative.
    // Since the uploads folder is now at the root, this ensures the correct path is used.
    const absolutePath = path.isAbsolute(imagePath)
      ? imagePath
      : path.resolve(imagePath);

    // Upload the image to Cloudinary
    const result = await cloudinary.v2.uploader.upload(absolutePath, {
      folder: "airflexy",
      width: 1200,
      height: 630,
      crop: "fill",
      gravity: "center",
    });

    if (result && result.secure_url) {
      const { error: insertError } = await supabase
        .from("images")
        .insert([{ property_id: propertyId, image_url: result.secure_url }]);

      if (insertError) {
        console.error("Failed to insert image into images table:", insertError);
      } else {
        console.log("Image inserted into images table:", result.secure_url);
        try {
          await fs.unlink(absolutePath);
          console.log(`Successfully deleted local file: ${absolutePath}`);
        } catch (unlinkError) {
          console.error(`Failed to delete local file ${absolutePath}:`, unlinkError);
        }
      }
    }
  } catch (err) {
    console.error("Image upload failed:", err);
  }
};

// Create a worker that processes jobs from the "image-upload" queue
const worker = new Worker(
  "image-upload",
  async (job) => {
    const { imagePaths, userId, propertyId } = job.data;

    if (Array.isArray(imagePaths)) {
      for (const imagePath of imagePaths) {
        await uploadToCloudinary(imagePath, userId, propertyId);
      }
    } else if (imagePaths) {
      await uploadToCloudinary(imagePaths, userId, propertyId);
    }
  },
  {
    connection: { 
      url: REDIS_URL,
      tls: {
        rejectUnauthorized: false
      }
    }
  }
);


(async () => {
  if (await queue.count()) {
    // The worker automatically starts processing jobs upon instantiation.
    console.log("Worker is active and processing jobs...");
  }
})();

// Listen for any job failures and log them
worker.on("failed", (job, err) => {
  console.error(`Image upload job failed for job ${job.id}:`, err);
});
