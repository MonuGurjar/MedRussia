export interface StudentDocumentMeta {
  url: string;
  public_id: string;
  folder: string;
  type: string;
  uploadedAt: Date;
}

export interface StudentRecord {
  _id: string;
  authId: string;
  name: string;
  phone: string;
  email: string;
  passportNumber: string;
  neetScore: string;
  assignedCounselor: string;
  status: string;
  documents: StudentDocumentMeta[];
}
