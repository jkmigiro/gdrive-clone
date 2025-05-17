"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { FaFile, FaFolder } from "react-icons/fa";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FilePreview from "./FilePreview";
import File from "@/models/File";
import SpinnerModal from "./SpinnerModal";
import Toast from "./Toast";

interface FileListProps {
  files: File[];
  fetchFilesAction: () => void;
}

// Utility to split file name and extension
const splitFileName = (name: string, isFile: boolean) => {
  if (!isFile) return { name, ext: "" };
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0) return { name, ext: "" }; // No extension or starts with dot
  return {
    name: name.slice(0, lastDot),
    ext: name.slice(lastDot),
  };
};

export default function FileList({ files, fetchFilesAction }: FileListProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isSpinnerOpen, setIsSpinnerOpen] = useState(false);
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { status } = useSession();

  // Filter files by current folder
  const filteredFiles = files.filter(
    (file) => (file.parentId?.toString() || null) === currentFolderId,
  );

  const handleDelete = async (id: string, type: string) => {
    setMessage(`Deleting ${type}...`);
    setIsSpinnerOpen(true);
    try {
      const res = await fetch("/files/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setMessage(
          `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
        );
        setIsToastOpen(true);
        fetchFilesAction();
        if (selectedFile && selectedFile._id.toString() === id) {
          setSelectedFile(null);
        }
      } else {
        const error = await res.json();
        throw new Error(error.error || "Deletion failed");
      }
    } catch (err) {
      setMessage(`Deletion failed: ${(err as Error).message}`);
      setIsToastOpen(true);
    } finally {
      setIsSpinnerOpen(false);
      closeToast();
    }
  };

  const handleRename = async (id: string, type: string) => {
    if (!newName.trim()) {
      setMessage("Name is required");
      setIsToastOpen(true);
      setRenameId(null);
      setNewName("");
      return;
    }
    setMessage(`Renaming ${type}...`);
    setIsSpinnerOpen(true);
    try {
      const file = files.find((f) => f._id.toString() === id);
      if (!file) throw new Error("File not found");
      const { ext } = splitFileName(file.name, file.type === "file");
      const finalName = type === "file" ? `${newName}${ext}` : newName;
      const res = await fetch("/files/rename", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, newName: finalName }),
      });
      if (res.ok) {
        setMessage(
          `${type.charAt(0).toUpperCase() + type.slice(1)} renamed successfully`,
        );
        setIsToastOpen(true);
        fetchFilesAction();
        setRenameId(null);
        setNewName("");
        if (selectedFile && selectedFile._id.toString() === id) {
          file.name = newName;
          setSelectedFile(file);
        }
      } else {
        const error = await res.json();
        throw new Error(error.error || "Rename failed");
      }
    } catch (err) {
      setMessage(`Rename failed: ${(err as Error).message}`);
      setIsToastOpen(true);
    } finally {
      setIsSpinnerOpen(false);
      closeToast();
    }
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedFile(null);
  };

  const closeToast = () => {
    setTimeout(() => {
      setIsToastOpen(false);
    }, 3000);
  };
  if (status === "loading" || status === "unauthenticated") {
    return null;
  }

  return (
    <Box
      sx={{
        bgcolor: "white",
        p: { xs: 2, sm: 4 },
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Your Files
      </Typography>
      {currentFolderId && (
        <Button
          onClick={() => navigateToFolder(null)}
          variant="outlined"
          color="secondary"
          sx={{ mb: 2, textTransform: "none" }}
          aria-label="Back to root folder"
        >
          Back to Root
        </Button>
      )}
      <List aria-label="File and folder list">
        {filteredFiles.length === 0 ? (
          <ListItem>
            <Typography color="text.secondary">
              No files or folders found
            </Typography>
          </ListItem>
        ) : (
          filteredFiles.map((file) => {
            const { name: displayName } = splitFileName(
              file.name,
              file.type === "file",
            );
            return (
              <ListItem
                key={file._id.toString()}
                sx={{
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                  p: { xs: 1, sm: 2 },
                  borderBottom: "1px solid",
                  borderColor: "grey.200",
                  "&:hover": { bgcolor: "grey.50" },
                  gap: { xs: 1, sm: 0 },
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  {file.type === "folder" ? (
                    <FaFolder
                      className="cursor-pointer text-blue-500"
                      size={24}
                      onClick={() => navigateToFolder(file._id.toString())}
                      aria-label={`Navigate to ${file.name} folder`}
                    />
                  ) : (
                    <FaFile
                      className="text-gray-500"
                      size={24}
                      aria-label="File icon"
                    />
                  )}
                  {renameId === file._id.toString() ? (
                    <TextField
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onBlur={() =>
                        handleRename(file._id.toString(), file.type)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleRename(file._id.toString(), file.type);
                        if (e.key === "Escape") {
                          setRenameId(null);
                          setNewName("");
                        }
                      }}
                      size="small"
                      fullWidth
                      sx={{ maxWidth: { xs: "100%", sm: 200 } }}
                      inputProps={{
                        "aria-label": `Rename ${file.type} ${file.name}`,
                      }}
                      autoFocus
                    />
                  ) : (
                    <Typography
                      onClick={() =>
                        file.type === "file"
                          ? setSelectedFile(file)
                          : navigateToFolder(file._id.toString())
                      }
                      sx={{
                        cursor: "pointer",
                        "&:hover": { textDecoration: "underline" },
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                      }}
                      aria-label={
                        file.type === "file"
                          ? `Preview ${file.name}`
                          : `Open ${file.name} folder`
                      }
                    >
                      {displayName}
                    </Typography>
                  )}
                </Box>
                <Box display="flex" gap={1}>
                  <Button
                    onClick={() => {
                      const { name } = splitFileName(
                        file.name,
                        file.type === "file",
                      );
                      setRenameId(file._id.toString());
                      setNewName(name);
                    }}
                    variant="contained"
                    color="warning"
                    size="small"
                    sx={{ textTransform: "none", px: 3, py: 1 }}
                    aria-label={`Rename ${file.name}`}
                  >
                    Rename
                  </Button>
                  <Button
                    onClick={() => handleDelete(file._id.toString(), file.type)}
                    variant="contained"
                    color="error"
                    size="small"
                    sx={{ textTransform: "none", px: 3, py: 1 }}
                    aria-label={`Delete ${file.name}`}
                  >
                    Delete
                  </Button>
                </Box>
              </ListItem>
            );
          })
        )}
      </List>
      {selectedFile && <FilePreview file={selectedFile} />}
      <SpinnerModal open={isSpinnerOpen} message={message} />
      <Toast open={isToastOpen} message={message} />
    </Box>
  );
}
