import { promises as fs } from 'fs';
import { join } from 'path';

const STORAGE_PATH: string = join(process.cwd(), 'store');

export async function saveFile(file: Buffer, userId: string, fileName: string): Promise<string> {
    const userDir: string = join(STORAGE_PATH, userId);
    await fs.mkdir(userDir, { recursive: true });
    const filePath: string = join(userDir, fileName);
    await fs.writeFile(filePath, file);
    return filePath;
}

export async function deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
}

export async function getFilePath(userId: string, fileName: string): Promise<string> {
    return join(STORAGE_PATH, userId, fileName);
}