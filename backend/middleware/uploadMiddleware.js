import multer from 'multer';

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, "uploads/");
    },
    filename(req, file, cb) {
        const ext=path.extname(file.originalname);
        const basename=path.basename(file.originalname,ext);
        const sessionId=req.params.id || 'unknown';
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const fileFilter=(req, file, cb)=>{
    if(file.mimetype.startWith("audio/")|| file.mimetype==="application/octet-stream")
    {
        cb(null, true);
    } else {
        cb(new Error("Not an audio file"), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter,
    limits: {fileSize:1024*1024*10},
});

const uploadSingleAudio=upload.single("audio");
export { uploadSingleAudio };
