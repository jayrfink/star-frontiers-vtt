import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, requireGM } from './middleware.js';

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

export function sanitizeUploadPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return null;
  let clean = inputPath.trim().replace(/\\/g, '/');
  if (clean.startsWith('/uploads/')) {
    clean = clean.slice('/uploads/'.length);
  } else if (clean.startsWith('uploads/')) {
    clean = clean.slice('uploads/'.length);
  }
  clean = clean.replace(/^\/+|\/+$/g, '');
  if (!clean) return null;
  const parts = clean.split('/').filter(Boolean);
  if (parts.some((p) => p === '..' || p === '.')) {
    return null;
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

export function createUploadRouter(customUploadDir, db, io) {
  const uploadDir = customUploadDir || DEFAULT_UPLOADS_DIR;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const gmGuard = db
    ? requireGM(db)
    : (req, res, next) => {
        if (!req.session || !req.session.userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        return res.status(403).json({ error: 'GameMaster access required' });
      };

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

  router.put('/rename', gmGuard, (req, res) => {
    try {
      const oldPath = req.body?.oldPath || req.body?.oldUrl;
      const newName = req.body?.newName;

      const relSource = sanitizeUploadPath(oldPath);
      if (!relSource) {
        return res.status(400).json({ error: 'Invalid or missing oldPath' });
      }

      if (!newName || typeof newName !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing newName' });
      }

      const trimmedNewName = newName.trim();
      if (
        trimmedNewName.includes('/') ||
        trimmedNewName.includes('\\') ||
        trimmedNewName.includes('..') ||
        trimmedNewName === '.'
      ) {
        return res.status(400).json({ error: 'Invalid newName' });
      }

      const ext = path.extname(trimmedNewName).toLowerCase();
      if (!VALID_IMAGE_EXTENSIONS.has(ext)) {
        return res.status(400).json({ error: 'Invalid file extension' });
      }

      const sourcePath = path.resolve(uploadDir, relSource);
      const relativeSource = path.relative(uploadDir, sourcePath);
      if (relativeSource.startsWith('..') || path.isAbsolute(relativeSource)) {
        return res.status(400).json({ error: 'Invalid path' });
      }

      const targetPath = path.join(path.dirname(sourcePath), trimmedNewName);
      const relativeTarget = path.relative(uploadDir, targetPath);
      if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
        return res.status(400).json({ error: 'Invalid path' });
      }

      if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
        return res.status(404).json({ error: 'Source file not found' });
      }

      if (fs.existsSync(targetPath)) {
        return res.status(409).json({ error: 'Target file already exists' });
      }

      fs.renameSync(sourcePath, targetPath);

      const oldRel = path.relative(uploadDir, sourcePath).split(path.sep).join('/');
      const newRel = path.relative(uploadDir, targetPath).split(path.sep).join('/');
      const oldUrl = `/uploads/${oldRel}`;
      const newUrl = `/uploads/${newRel}`;

      if (db) {
        const cascadeRename = db.transaction((toUrl, fromUrl) => {
          db.prepare('UPDATE adversary_templates SET token_image_path = ? WHERE token_image_path = ?').run(toUrl, fromUrl);
          db.prepare('UPDATE tokens SET avatar_url = ? WHERE avatar_url = ?').run(toUrl, fromUrl);
          db.prepare('UPDATE maps SET background_url = ? WHERE background_url = ?').run(toUrl, fromUrl);
          db.prepare('UPDATE character_sheets SET avatar_url = ? WHERE avatar_url = ?').run(toUrl, fromUrl);
          db.prepare('UPDATE ship_sheets SET avatar_url = ? WHERE avatar_url = ?').run(toUrl, fromUrl);
        });
        cascadeRename(newUrl, oldUrl);
      }

      if (io) {
        io.emit('token:asset-renamed', { oldUrl, newUrl });
        io.emit('map:asset-renamed', { oldUrl, newUrl });
      }

      res.json({ success: true, oldUrl, newUrl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/move', gmGuard, (req, res) => {
    try {
      const rawSource = req.body?.sourcePath || req.body?.sourceUrl || req.body?.oldPath || req.body?.oldUrl;
      const relSource = sanitizeUploadPath(rawSource);
      if (!relSource) {
        return res.status(400).json({ error: 'Invalid or missing sourcePath' });
      }

      const sourceFullPath = path.resolve(uploadDir, relSource);
      const relativeSource = path.relative(uploadDir, sourceFullPath);
      if (relativeSource.startsWith('..') || path.isAbsolute(relativeSource)) {
        return res.status(400).json({ error: 'Invalid path' });
      }

      const rawDestFolder = req.body?.destinationFolder ?? req.body?.destinationPath ?? req.body?.targetFolder ?? '';
      let targetDestFolder;
      try {
        targetDestFolder = sanitizeFolder(rawDestFolder);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }

      const destDir = targetDestFolder ? path.resolve(uploadDir, targetDestFolder) : uploadDir;
      const relativeDest = path.relative(uploadDir, destDir);
      if (relativeDest.startsWith('..') || path.isAbsolute(relativeDest)) {
        return res.status(400).json({ error: 'Invalid path' });
      }

      if (!fs.existsSync(sourceFullPath) || !fs.statSync(sourceFullPath).isFile()) {
        return res.status(404).json({ error: 'Source file not found' });
      }

      const targetFilename = path.basename(sourceFullPath);
      const destFullPath = path.join(destDir, targetFilename);
      const relativeTarget = path.relative(uploadDir, destFullPath);
      if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
        return res.status(400).json({ error: 'Invalid path' });
      }

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      if (fs.existsSync(destFullPath)) {
        return res.status(409).json({ error: 'Target file already exists' });
      }

      fs.renameSync(sourceFullPath, destFullPath);

      const oldRel = path.relative(uploadDir, sourceFullPath).split(path.sep).join('/');
      const newRel = path.relative(uploadDir, destFullPath).split(path.sep).join('/');
      const oldUrl = `/uploads/${oldRel}`;
      const newUrl = `/uploads/${newRel}`;

      if (db) {
        const cascadeMove = db.transaction((toUrl, fromUrl) => {
          db.prepare('UPDATE adversary_templates SET token_image_path = ? WHERE token_image_path = ?').run(toUrl, fromUrl);
          db.prepare('UPDATE tokens SET avatar_url = ? WHERE avatar_url = ?').run(toUrl, fromUrl);
          db.prepare('UPDATE maps SET background_url = ? WHERE background_url = ?').run(toUrl, fromUrl);
          db.prepare('UPDATE character_sheets SET avatar_url = ? WHERE avatar_url = ?').run(toUrl, fromUrl);
          db.prepare('UPDATE ship_sheets SET avatar_url = ? WHERE avatar_url = ?').run(toUrl, fromUrl);
        });
        cascadeMove(newUrl, oldUrl);
      }

      if (io) {
        io.emit('token:asset-renamed', { oldUrl, newUrl });
        io.emit('map:asset-renamed', { oldUrl, newUrl });
      }

      return res.json({ success: true, oldUrl, newUrl });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/folder', gmGuard, (req, res) => {
    try {
      const rawFolder = req.body?.folder;
      if (rawFolder === undefined || rawFolder === null || typeof rawFolder !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing folder name' });
      }

      let sanitizedFolder;
      try {
        sanitizedFolder = sanitizeFolder(rawFolder);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!sanitizedFolder) {
        return res.status(400).json({ error: 'Invalid or missing folder name' });
      }

      const targetDir = path.resolve(uploadDir, sanitizedFolder);
      const relativeToRoot = path.relative(uploadDir, targetDir);
      if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
        return res.status(400).json({ error: 'Invalid folder path' });
      }

      if (fs.existsSync(targetDir)) {
        return res.status(409).json({ error: 'Folder already exists' });
      }

      fs.mkdirSync(targetDir, { recursive: true });
      return res.status(201).json({ success: true, folder: sanitizedFolder });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.delete('/folder', gmGuard, (req, res) => {
    try {
      const rawFolder = req.query?.folder !== undefined ? req.query.folder : req.body?.folder;
      if (rawFolder === undefined || rawFolder === null || typeof rawFolder !== 'string') {
        return res.status(400).json({ error: 'Cannot delete root folder' });
      }

      let sanitizedFolder;
      try {
        sanitizedFolder = sanitizeFolder(rawFolder);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!sanitizedFolder) {
        return res.status(400).json({ error: 'Cannot delete root folder' });
      }

      const targetDir = path.resolve(uploadDir, sanitizedFolder);
      const relativeToRoot = path.relative(uploadDir, targetDir);
      if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
        return res.status(400).json({ error: 'Invalid folder path' });
      }

      if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      const entries = fs.readdirSync(targetDir);
      const nonHidden = entries.filter((e) => !e.startsWith('.'));
      if (nonHidden.length > 0) {
        return res.status(400).json({ error: 'Folder is not empty' });
      }

      fs.rmSync(targetDir, { recursive: true, force: true });
      return res.json({ success: true, folder: sanitizedFolder });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.delete('/file', gmGuard, (req, res) => {
    try {
      const rawPath = req.query?.path || req.body?.path || req.body?.url;
      const relPath = sanitizeUploadPath(rawPath);
      if (!relPath) {
        return res.status(400).json({ error: 'Invalid or missing file path' });
      }

      const filePath = path.resolve(uploadDir, relPath);
      const relativePath = path.relative(uploadDir, filePath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return res.status(400).json({ error: 'Invalid file path' });
      }

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return res.status(404).json({ error: 'File not found' });
      }

      fs.unlinkSync(filePath);

      const targetRel = path.relative(uploadDir, filePath).split(path.sep).join('/');
      const targetUrl = `/uploads/${targetRel}`;

      if (db) {
        const cascadeDelete = db.transaction((toClear) => {
          db.prepare("UPDATE adversary_templates SET token_image_path = '' WHERE token_image_path = ?").run(toClear);
          db.prepare("UPDATE tokens SET avatar_url = '' WHERE avatar_url = ?").run(toClear);
          db.prepare("UPDATE maps SET background_url = '' WHERE background_url = ?").run(toClear);
          db.prepare("UPDATE character_sheets SET avatar_url = '' WHERE avatar_url = ?").run(toClear);
          db.prepare("UPDATE ship_sheets SET avatar_url = '' WHERE avatar_url = ?").run(toClear);
        });
        cascadeDelete(targetUrl);
      }

      if (io) {
        io.emit('token:asset-deleted', { url: targetUrl });
        io.emit('map:asset-deleted', { url: targetUrl });
      }

      res.json({ success: true, url: targetUrl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
