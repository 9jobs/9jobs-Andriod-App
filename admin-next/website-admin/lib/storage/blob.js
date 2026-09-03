import mongoose from 'mongoose';
import { Readable } from 'stream';

import connectDB from '@/utils/db';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const STORAGE_BUCKET_NAME = 'agreementFiles';
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'agreement-files';
const GRIDFS_PROTOCOL = 'gridfs://';

function normalizeStorageKey(folder, fileName) {
  const safeFolder = String(folder || '').replace(/^\/+|\/+$/g, '');
  return safeFolder ? `${safeFolder}/${fileName}` : fileName;
}

function toGridFsUrl(key) {
  return `${GRIDFS_PROTOCOL}${encodeURIComponent(key)}`;
}

function extractGridFsKey(url) {
  if (!url?.startsWith(GRIDFS_PROTOCOL)) {
    return '';
  }

  return decodeURIComponent(url.slice(GRIDFS_PROTOCOL.length));
}

function toSupabaseStorageKey(key) {
  return String(key)
    .split('/')
    .map((segment) => segment.replace(/[^\x20-\x7E]/g, (character) => `_u${character.codePointAt(0).toString(16)}_`))
    .join('/');
}

function isSupabaseEnabled() {
  return process.env.DATABASE_PROVIDER === 'supabase';
}

async function getBucket() {
  await connectDB();

  const db = mongoose.connection?.db;
  if (!db) {
    throw new Error('MongoDB connection is required for GridFS storage.');
  }

  return new mongoose.mongo.GridFSBucket(db, {
    bucketName: STORAGE_BUCKET_NAME,
  });
}

async function getFilesCollection() {
  await connectDB();

  const db = mongoose.connection?.db;
  if (!db) {
    throw new Error('MongoDB connection is required for GridFS storage.');
  }

  return db.collection(`${STORAGE_BUCKET_NAME}.files`);
}

async function getFileRecordByKey(key) {
  const files = await getFilesCollection();
  return files.findOne({ filename: key }, { sort: { uploadDate: -1 } });
}

async function bufferFromStream(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function uploadPrivatePdf({ folder, fileName, buffer, contentType = 'application/pdf', metadata = {} }) {
  const path = normalizeStorageKey(folder, fileName);
  if (isSupabaseEnabled()) {
    const { error } = await getSupabaseServerClient().storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(toSupabaseStorageKey(path), buffer, { contentType, upsert: true, metadata });
    if (error) throw new Error(`Supabase file upload failed: ${error.message}`);
    return { url: toGridFsUrl(path), path, id: path };
  }
  await deleteStoredFileByKey(path).catch(() => {});
  const bucket = await getBucket();

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(path, {
      contentType,
      metadata,
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({
        url: toGridFsUrl(path),
        path,
        id: String(uploadStream.id),
      });
    });

    uploadStream.end(buffer);
  });
}

export async function fetchBlobBuffer(url) {
  const gridFsKey = extractGridFsKey(url);
  if (gridFsKey) {
    return fetchBlobBufferByKey(gridFsKey);
  }

  const response = await fetch(url, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch stored asset (${response.status}).`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function fetchBlobBufferByKey(key) {
  if (!key) {
    throw new Error('Storage key is required to retrieve stored content.');
  }

  if (isSupabaseEnabled()) {
    const { data, error } = await getSupabaseServerClient().storage.from(SUPABASE_STORAGE_BUCKET).download(toSupabaseStorageKey(key));
    if (error) throw new Error(`Supabase file download failed: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
  const { stream } = await openDownloadStreamByKey(key);
  return bufferFromStream(stream);
}

export async function openDownloadStreamByKey(key) {
  if (!key) {
    throw new Error('Storage key is required to open a download stream.');
  }

  if (isSupabaseEnabled()) {
    const buffer = await fetchBlobBufferByKey(key);
    return {
      file: { filename: key, contentType: 'application/pdf', metadata: {} },
      stream: Readable.from(buffer),
    };
  }
  const bucket = await getBucket();
  const file = await getFileRecordByKey(key);
  if (!file) {
    throw new Error(`Stored asset not found for key: ${key}`);
  }

  return {
    file,
    stream: bucket.openDownloadStream(file._id),
  };
}

export async function deleteStoredFileByKey(key) {
  if (!key) {
    return 0;
  }

  if (isSupabaseEnabled()) {
    const { data, error } = await getSupabaseServerClient().storage.from(SUPABASE_STORAGE_BUCKET).remove([toSupabaseStorageKey(key)]);
    if (error) throw new Error(`Supabase file deletion failed: ${error.message}`);
    return data?.length || 0;
  }
  const bucket = await getBucket();
  const files = await getFilesCollection();
  const matches = await files.find({ filename: key }).toArray();

  for (const file of matches) {
    await bucket.delete(file._id);
  }

  return matches.length;
}

