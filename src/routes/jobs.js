import dotenv from 'dotenv';
import { Router } from "express";
const router = Router();
import { Queue } from "bullmq";
dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

// Create a Redis Queue instance
const queue = new Queue("image-upload", {
  redis: { url: REDIS_URL },
});
router.get("/", async (req, res) => {
  try {
    const activeJobs = await queue.getActive();

    const activeJobIds = activeJobs.map((job) => job.id);

    res.status(200).json({ message: "active jobs", activeJobIds });
  } catch (error) {
    console.error("Error fetching active jobs:", error);
    res.status(500).send("Internal server error");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    const status = await job.getState();
    const progress = JSON.stringify(job.progress);

    const result = {
      id: job.id,
      data: job.data,
      status: status,
      progress: progress,
    };

    res
      .status(200)
      .json({ result });
  } catch (error) {
    console.error("Error fetching running jobs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;