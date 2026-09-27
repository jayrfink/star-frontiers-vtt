import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from './middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_UPLOADS_DIR = path.resolve(__dirname, '../../data/uploads');
const VALID_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

export function sanitizeFolder(folder) {
  if (!folder || typeof folder !== 'string') return '';
  const trimmed = folder.trim().replace(/\\/g, '/');
  const clean = trimmed.replace(/^\/+|\/+$/g, '');
  if (!clean) return '';
  const parts = clean.split('/').filter(Boolean);
  if (parts.some((p) => p === '..' || p === '.')) {
    throw new Error('Invalid folder path');
  }
  return parts.join('/');
}

export function scanUploads(dir, baseDir = dir) {
  const files = [];
  const folders = new Set(['']);

  if (!fs.existsSync(dir)) {
    return { files, folders: Array.from(folders) };
  }

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(baseDir, fullPath).split(path.sep).join('/');

      if (entry.isDirectory()) {
        folders.add(relPath);
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VALID_IMAGE_EXTENSIONS.has(ext)) {
          let stats;
          try {
            stats = fs.statSync(fullPath);
          } catch {
            continue;
          }
          const relDir = path.dirname(relPath).split(path.sep).join('/');
          const folder = relDir === '.' || relDir === '' ? '' : relDir;
          if (folder) {
            folders.add(folder);
          }
          files.push({
            name: entry.name,
            relativePath: relPath,
            folder: folder,
            url: `/uploads/${relPath}`,
            size: stats.size,
            mtime: stats.mtime.toISOString(),
          });
        }
      }
    }
  }

  walk(dir);

  const sortedFolders = Array.from(folders).sort((a, b) => {
    if (a === '') return -1;
    if (b === '') return 1;
    return a.localeCompare(b);
  });

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return { files, folders: sortedFolders };
}

export function createUploadRouter(customUploadDir) {
  const uploadDir = customUploadDir || DEFAULT_UPLOADS_DIR;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      try {
        const rawFolder = req.body?.folder || req.query?.folder || '';
        const targetSubfolder = sanitizeFolder(rawFolder);
        const targetDir = targetSubfolder ? path.resolve(uploadDir, targetSubfolder) : uploadDir;
        const relativeToRoot = path.relative(uploadDir, targetDir);
        if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
          return cb(new Error('Invalid folder path'));
        }
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        cb(null, targetDir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  });

  const router = Router();
  router.use(requireAuth);

  router.get('/files', (_req, res) => {
    try {
      const result = scanUploads(uploadDir);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/', (req, res) => {
    upload.any()(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      const file = (req.files && req.files[0]) || req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      try {
        const rawFolder = req.body?.folder || req.query?.folder || '';
        const targetSubfolder = sanitizeFolder(rawFolder);
        const targetDir = targetSubfolder ? path.resolve(uploadDir, targetSubfolder) : uploadDir;
        const relativeToRoot = path.relative(uploadDir, targetDir);
        if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return res.status(400).json({ error: 'Invalid folder path' });
        }
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const targetPath = path.join(targetDir, path.basename(file.path));
        if (file.path !== targetPath) {
          fs.renameSync(file.path, targetPath);
          file.path = targetPath;
        }
      } catch (folderErr) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ error: folderErr.message });
      }

      const relPath = path.relative(uploadDir, file.path).split(path.sep).join('/');
      const publicUrl = `/uploads/${relPath}`;
      res.json({ url: publicUrl });
    });
  });

  return router;
}
