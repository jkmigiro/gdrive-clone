"use client";
import React, { useState } from "react";
import axios, { AxiosError } from "axios";
import { PacmanLoader } from "react-spinners";
import { useSession } from "next-auth/react";
import { Button, TextField } from "@mui/material";
import SpinnerModal from "./SpinnerModal";
import Toast from "./Toast";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";

export default function FolderCreate({
  fetchFilesAction,
}: {
  fetchFilesAction: () => void;
}) {
  const [name, setName] = useState("");
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [isSpinnerOpen, setIsSpinnerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { status } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage("Folder name is required");
      setIsToastOpen(true);
      return;
    }

    setIsSpinnerOpen(true);
    try {
      const response = await axios.post("/files/folders", { name });
      if (response.status === 200) {
        setName("");
        setMessage("Folder created successfully");
        setIsToastOpen(true);
        fetchFilesAction();
      } else {
        console.log("Response: ", response);
        setMessage("Unexpected response");
        setIsToastOpen(true);
      }
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create folder";
      setMessage(errorMessage);
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
      className="flex items-center space-x-2"
      aria-label="Create folder form"
    >
      <TextField
        id="folder-name"
        label="Folder Name"
        variant="outlined"
        size="medium"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        sx={{ mr: 2 }}
      />
      <Button
        type="submit"
        color="primary"
        variant="contained"
        startIcon={<CreateNewFolderIcon />}
        disabled={isSpinnerOpen}
        sx={{
          px: 3,
          py: 1.5,
          borderRadius: 2,
          boxShadow: 3,
          textTransform: "none",
          fontWeight: "bold",
        }}
      >
        Create Folder
      </Button>
      <Toast open={isToastOpen} message={message} />
      <SpinnerModal open={isSpinnerOpen} message="Creating folder..." />
    </form>
  );
}
