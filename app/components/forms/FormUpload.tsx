"use client";

import React, { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Button,
  TextField,
  Box,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FByte from "@/models/File";
import Toast from "../Toast";
import SpinnerModal from "../SpinnerModal";

interface FormUploadProps {
  fetchFilesAction: () => void;
  files: FByte[];
}

export default function FormUpload({
  fetchFilesAction,
  files,
}: FormUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [isSpinnerOpen, setIsSpinnerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const buttonProps = {
    justifyContent: "flex-start",
    px: 4,
    py: 2,
    borderRadius: 2,
    boxShadow: 3,
    textTransform: "none",
    fontWeight: "bold",
    width: { xs: "100%", sm: "auto" },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage("Please select a file");
      setIsToastOpen(true);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("File size exceeds 10MB");
      setIsToastOpen(true);
      return;
    }

    setIsSpinnerOpen(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedFolderId) {
        formData.append("parentId", selectedFolderId);
      }

      const res = await fetch("/files/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setMessage("File uploaded successfully");
        setIsToastOpen(true);
        setFile(null);
        setSelectedFolderId(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchFilesAction();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upload failed");
      }
    } catch (err) {
      setMessage("Failed to upload file: " + (err as Error).message);
      setIsToastOpen(true);
    } finally {
      setIsSpinnerOpen(false);
      closeToast();
    }
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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row sm:items-center gap-3"
      aria-label="File upload form"
    >
      <TextField
        id="file-upload"
        type="file"
        inputRef={fileInputRef}
        onChange={(e) =>
          setFile((e.target as HTMLInputElement).files?.[0] || null)
        }
        style={{ display: "none" }}
      />

      <Box sx={{ width: { xs: "100%", sm: 200 } }}>
        <label htmlFor="file-upload">
          <Button
            fullWidth
            variant="contained"
            component="span"
            onClick={() => fileInputRef.current?.click()}
            sx={buttonProps}
          >
            {file ? truncateFileName(file.name) : "Select file..."}
          </Button>
        </label>
      </Box>

      <FormControl size="small" sx={{ width: { xs: "100%", sm: "150px" } }}>
        <InputLabel id="folder-select-label">Folder</InputLabel>
        <Select
          color="primary"
          labelId="folder-select-label"
          id="folder-select"
          value={selectedFolderId || ""}
          label="Folder"
          variant="outlined"
          onChange={(e) => setSelectedFolderId(e.target.value || null)}
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            boxShadow: 3,
            fontWeight: "bold",
            width: { xs: "100%", sm: "auto" },
            textTransform: "none",
          }}
        >
          <MenuItem value="">Root</MenuItem>
          {files
            .filter((f) => f.type === "folder")
            .map((folder) => (
              <MenuItem
                key={folder._id.toString()}
                value={folder._id.toString()}
              >
                {folder.name}
              </MenuItem>
            ))}
        </Select>
      </FormControl>

      <Button
        type="submit"
        color="primary"
        variant="contained"
        startIcon={<UploadFileIcon />}
        disabled={isSpinnerOpen || !file}
        sx={buttonProps}
      >
        Upload
      </Button>

      <Toast open={isToastOpen} message={message} />
      <SpinnerModal open={isSpinnerOpen} message="Uploading file..." />
    </form>
  );
}

function truncateFileName(text: string, front = 10, back = 3) {
  if (text.length <= front + back + 3) return text;
  return `${text.slice(0, front)}...${text.slice(-back)}`;
}
