import mongoose, { Model, Schema } from 'mongoose';
import User from '../models/User';
import File from '../models/File';


const userSchema: Schema<User> = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});


const fileSchema: Schema<File> = new mongoose.Schema({
    name: String,
    type: String,
    path: String,
    userId: mongoose.Schema.Types.ObjectId,
    parentId: mongoose.Schema.Types.ObjectId,
    size: Number,
    mimeType: String,
    createdAt: { type: Date, default: Date.now },
});

export const UserModel: Model<User> =mongoose.models.User ||mongoose.model<User>('User', userSchema);
export const FileModel: Model<File> =mongoose.models.File ||mongoose.model<File>('File', fileSchema);

export async function connectToDatabase(): Promise<void> {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(process.env.MONGODB_URI as string);
}
