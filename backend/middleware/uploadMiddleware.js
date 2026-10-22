
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure the uploads directory exists before Multer writes files.
const uploadDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${path.basename(file.originalname, ext)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // FIX: startsWith(), not startWith()
  if (
    file.mimetype.startsWith('audio/') ||
    file.mimetype === 'application/octet-stream'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Not an audio file'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

const uploadSingleAudio = upload.single('audioFile');

export { uploadSingleAudio };




// import multer from 'multer';

// const storage = multer.diskStorage({
//     destination(req, file, cb) {
//         cb(null, "uploads/");
//     },
//     filename(req, file, cb) {
//         const ext=path.extname(file.originalname);
//         const basename=path.basename(file.originalname,ext);
//         const sessionId=req.params.id || 'unknown';
//         cb(null, `${Date.now()}-${file.originalname}`);
//     },
// });

// const fileFilter=(req, file, cb)=>{
//     if(file.mimetype.startWith("audio/")|| file.mimetype==="application/octet-stream")
//     {
//         cb(null, true);
//     } else {
//         cb(new Error("Not an audio file"), false);
//     }
// };

// const upload = multer({
//     storage: storage,
//     fileFilter,
//     limits: {fileSize:1024*1024*10},
// });

// const uploadSingleAudio=upload.single("audioFile");
// export { uploadSingleAudio };
