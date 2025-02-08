// utils/multer.js
import multer from 'multer';
import path from 'path';

// Make sure you have an uploads folder at the root of your project or create one
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files in the "uploads" folder
  },
  filename: (req, file, cb) => {
    // Create a unique filename using the current timestamp and the original name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const allowedExtensions = ['.jpg', '.jpeg', '.png'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Only images are allowed'), false);
  }
  cb(null, true);
};

export default multer({
  storage,
  fileFilter,
});
