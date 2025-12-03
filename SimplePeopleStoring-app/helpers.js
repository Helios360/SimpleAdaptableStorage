// ------------------------- IMPORTS ------------------------- //
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');
const mysql = require('mysql2/promise');
const helmet = require('helmet');
const { Router } = require('express');
const router = Router();
// ------------------------- CONSTS ------------------------- //
const ALLOWED_MIME = new Set(['application/pdf','image/jpeg','image/png']);
const ALLOWED_EXT = new Set(['.pdf','.jpg','.jpeg','.png']);

const BASE_DIR = path.resolve(process.env.APP_BASE_DIR || __dirname);
const UPLOADS_ROOT = path.resolve(process.env.APP_UPLOADS_DIR || path.join(BASE_DIR, 'uploads'));
const TOS_VERSION = process.env.TOS_VERSION;
const WATERMARK_PATH = path.resolve('./public/sources/LogoBleuOmbre-edited.png');

const userDir = (uid) => path.join(UPLOADS_ROOT, `u_${uid}`);
const relFromAbs = (abs) => path.relative(UPLOADS_ROOT, abs).replace(/\\/g, '/');

const toAbsFromStored = (stored) => {
  if (!stored) return null;
  const rel = stored.replace(/^[\\/]+/,'');
  const abs = path.normalize(path.join(UPLOADS_ROOT,rel));
  if(!abs.startsWith(UPLOADS_ROOT + path.sep)){
    throw new Error('Path escapes uploads root');
  }
  return abs;
}

// === Security headers setup ===
router.use(helmet({ 
  crossOriginResourcePolicy: { policy: 'same-site'},
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "connect-src": ["'self'"],
      "img-src": ["'self'", "data:", "blob:"],
      "object-src": ["'none'"],
      "frame-ancestors": ["'none'"],
      "base-uri": ["'self'"]
    }
  },
  referrerPolicy: {policy: "no-referrer"}
}));
const allowIframeSelf = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    "default-src": ["'self'"],
    "script-src": ["'self'"],
    "connect-src": ["'self'"],
    "img-src": ["'self'", "data:", "blob:"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'self'"],
    "base-uri": ["'self'"]
  }
})

// ------------------------- DB CODE CONFIG ------------------------- //
const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});
// Main async db calls
async function q(sql, params=[]) { 
  const [rows] = await db.execute(sql, params); 
  return rows;
}

// ------------------------- MIME GUESSER ------------------------- //
function guessContentType(p){
  const ext = (path.extname(p)||'').toLowerCase();
  if(ext==='.pdf') return 'application/pdf';
  if(ext==='.png') return 'image/png';
  if(ext==='.jpg' || ext==='.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

// ------------------------- ADDS WATERMARKS FOR PDFS ------------------------- //
async function addWatermark(pdfPath, outputPath){
  try{
    // charge existing pdf
    const existingPdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    // charge watermark
    const watermarkImageBytes = await fs.readFile(WATERMARK_PATH);
    const watermarkImage = await pdfDoc.embedPng(watermarkImageBytes);
    const watermarkDims = watermarkImage.scale(0.1);

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const { width } = firstPage.getSize();

    const x = (width - watermarkDims.width) - 5;
    const y = watermarkDims.height - 70;
    
    firstPage.drawImage(watermarkImage, { x,y,width: watermarkDims.width,height: watermarkDims.height, opacity: 0.8 });

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    return true;
  } catch (err) {
    console.error('Watermark apply error:', err);
    return false;
  }
}

// ------------------------- CRUD === USER DELETE ------------------------- //
async function deleteUser(userId) {
  const userFolder = path.resolve(UPLOADS_ROOT, `u_${userId}`);
  try { await fs.rm(userFolder, { recursive: true, force: true});} 
  catch (e) { if (e.code !== 'ENOENT') console.warn('File RM Error: ', userFolder, e.message); }

  const confirm = await q('DELETE FROM Users WHERE id = ?',[userId]);
  if ((confirm?.affectedRows || 0) === 0) {
    const err = new Error('User not found while trying to Delete user:');
    err.status = 404;
    throw err;
  }
}

// ------------------------- KIND CHECK AT SQL LEVEL ------------------------- //
async function kindCheck(kind, userId){
  if(!['cv', 'id_doc', 'id_doc_verso', 'state_work_auth'].includes(kind)) return {ok: false, reason: 'bad-kind'};
  const results = await q('SELECT cv, id_doc, id_doc_verso, state_work_auth FROM Users WHERE id=?', [userId]);
  if (results.length === 0) return {ok: false, reason: 'User not found . . .'};
  return {ok: true, path: results[0][kind] || null};
}

// ------------------------- SQL FILEPATH DELETE ------------------------- //
async function deleteFile(userId, action) {
  const results = await q('SELECT cv, id_doc, id_doc_verso, state_work_auth FROM Users WHERE id=?', [userId]);
  if (!results || !results[0]) throw Object.assign(new Error('User not found'), {status : 404});
  const user = results[0];
  let filename = null;
  let nullTheColumn = null;
  if(action === 'del' && user.id_doc) {filename = toAbsFromStored(user.id_doc);nullTheColumn = 'id_doc';}
  else if(action === 'delV' && user.id_doc_verso) {filename = toAbsFromStored(user.id_doc_verso);nullTheColumn = 'id_doc_verso';} 
  else if(action === 'delCV' && user.cv) {filename = toAbsFromStored(user.cv);nullTheColumn = 'cv';}
  else if(action === 'delAT' && user.state_work_auth) {filename = toAbsFromStored(user.state_work_auth);nullTheColumn = 'state_work_auth';}
  else { return {success: false} }
  
  try { await fs.unlink(filename); }
  catch (e){
    if (e.code !== 'ENOENT'){
      console.warn('Unlink error:', e);
      const err = new Error("File can't be deleted"); err.status=500; throw err;
    } else { console.log('File already deleted'); }
  }
  if (action === 'delAT'){ await q(`UPDATE Users SET ${nullTheColumn} = 'empty' WHERE id=?`, [userId]); } 
  else { await q(`UPDATE Users SET ${nullTheColumn} = NULL WHERE id=?`, [userId]); }
  return {success: true};
}

module.exports = {
    // === constants ===
    ALLOWED_MIME, ALLOWED_EXT, BASE_DIR, UPLOADS_ROOT, TOS_VERSION, WATERMARK_PATH,
    // === helpers ===
    userDir, relFromAbs, toAbsFromStored, guessContentType, addWatermark,
    // === db + ops ===
    q, db,
    deleteUser, kindCheck, deleteFile, allowIframeSelf,
};