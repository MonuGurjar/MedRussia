import { getCollection } from '../lib/mongodb';
import type { StudentDocumentMeta, StudentRecord } from './student';

export async function upsertStudentByAuthId(input: Omit<StudentRecord, '_id'>): Promise<StudentRecord> {
  const col = await getCollection<StudentRecord>('students');
  await col.updateOne(
    { authId: input.authId },
    { $set: { ...input } },
    { upsert: true }
  );

  const doc = await col.findOne({ authId: input.authId });
  if (!doc) throw new Error('Failed to upsert student');
  return doc;
}

export async function addStudentDocument(input: {
  authId: string;
  document: StudentDocumentMeta;
}): Promise<void> {
  const col = await getCollection<StudentRecord>('students');
  await col.updateOne(
    { authId: input.authId },
    { $push: { documents: input.document } },
    { upsert: false }
  );

  const metadataCol = await getCollection<any>('document_metadata');
  await metadataCol.insertOne({
    authId: input.authId,
    ...input.document,
    createdAt: new Date(),
  });
}
