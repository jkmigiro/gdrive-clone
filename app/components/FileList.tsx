"use client";

import { useEffect, useState } from "react";
import { FaFile, FaFolder } from "react-icons/fa";
import FilePreview from "./FilePreview";
import File from "@/models/File";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FileList({ uploadedFiles }: { uploadedFiles: any[] }) {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const fetchFiles = async () => {
    const res = await fetch("/files");
    if (!res.ok) {
      console.error("Failed to fetch files");
      return;
    }
    const data: File[] = await res.json();
    // Filter files by current folder (null for root)
    setFiles(
      data.filter(
        (file) => (file.parentId?.toString() || null) === currentFolderId,
      ),
    );
  };

  useEffect(() => {
    console.log("Uploaded files: ", uploadedFiles);
    fetchFiles();
  }, [currentFolderId]);

  const handleDelete = async (id: string) => {
    const res = await fetch("/files/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      fetchFiles();
    } else {
      const error = await res.json();
      alert(`Deletion failed: ${error.error || "Unknown error"}`);
    }
  };

  const handleRename = async (id: string) => {
    if (!newName) return;
    const res = await fetch("/files/rename", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, newName }),
    });

    if (res.ok) {
      fetchFiles();
      setRenameId(null);
      setNewName("");
    } else {
      const error = await res.json();
      alert(`Rename failed: ${error.error || "Unknown error"}`);
    }
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedFile(null); // Clear selected file when navigating
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Your Files</h2>
      {currentFolderId && (
        <button
          onClick={() => navigateToFolder(null)}
          className="mb-4 p-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Back to Root
        </button>
      )}
      <ul>
        {files.length === 0 && (
          <li className="p-2 text-gray-500">No files or folders found</li>
        )}
        {files.map((file) => (
          <li
            key={file._id.toString()}
            className="flex items-center justify-between p-2 border-b hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              {file.type === "folder" ? (
                <FaFolder
                  className="cursor-pointer text-blue-500"
                  onClick={() => navigateToFolder(file._id.toString())}
                />
              ) : (
                <FaFile className="text-gray-500" />
              )}
              {renameId === file._id.toString() ? (
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={() => handleRename(file._id.toString())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(file._id.toString());
                    if (e.key === "Escape") {
                      setRenameId(null);
                      setNewName("");
                    }
                  }}
                  className="p-1 border rounded w-48"
                  autoFocus
                />
              ) : (
                <span
                  onClick={() =>
                    file.type === "file"
                      ? setSelectedFile(file)
                      : navigateToFolder(file._id.toString())
                  }
                  className="cursor-pointer hover:underline"
                >
                  {file.name}
                </span>
              )}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => {
                  setRenameId(file._id.toString());
                  setNewName(file.name);
                }}
                className="p-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Rename
              </button>
              <button
                onClick={() => handleDelete(file._id.toString())}
                className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {selectedFile && <FilePreview file={selectedFile} />}
    </div>
  );
}
