import multer from 'multer'; //TODO: install types

const storage = multer.memoryStorage();

export const upload = multer({ storage: storage });
