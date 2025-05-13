"use client";

import React, { useState, useEffect } from "react";
import FByte from "@/models/File";

export default function FormUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [folders, setFolders] = useState<FByte[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch folders
    const fetchFolders = async () => {
      const res = await fetch("/files");
      const data: FByte[] = await res.json();
      setFolders(data.filter((item) => item.type === "folder"));
    };
    fetchFolders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("Handling submit");
    e.preventDefault();
    if (!file) return;
    console.log("Finished Handling submit");
    const formData = new FormData();
    formData.append("file", file);
    if (selectedFolderId) {
      formData.append("parentId", selectedFolderId); // Add parentId
    }
    console.log("Uploading with form data: ", formData);
    const res = await fetch("/files/upload", {
      method: "POST",
      body: formData,
    });

    console.log("Response after upload: ", res.body);

    if (res.ok) {
      alert("File uploaded");
      setFile(null);
      setSelectedFolderId(null);
    } else {
      alert("Upload failed");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="p-2 border rounded"
      />
      <select
        value={selectedFolderId || ""}
        onChange={(e) => setSelectedFolderId(e.target.value || null)}
        className="p-2 border rounded"
      >
        <option value="">Root</option>
        {folders.map((folder) => (
          <option key={folder._id.toString()} value={folder._id.toString()}>
            {folder.name}
          </option>
        ))}
      </select>
      <button type="submit" className="p-2 bg-blue-500 text-white rounded">
        Upload
      </button>
    </form>
  );
}
