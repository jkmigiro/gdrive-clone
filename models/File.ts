import { ObjectId } from "mongoose";
export default interface File {
  _id: ObjectId;
  name: string;
  type: "file" | "folder";
  path?: string;
  userId: ObjectId;
  parentId?: ObjectId;
  size?: number;
  mimeType?: string;
  createdAt: Date;
}
