"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FileList from "../components/FileList";
import FormUpload from "../components/forms/FormUpload";
import FolderCreate from "../components/FolderCreate";
import Navbar from "../components/navigation/NavBar";
import File from "@/models/File";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  const fetchFiles = async () => {
    try {
      const res = await fetch("/files");
      if (!res.ok) throw new Error("Failed to fetch files");
      const data: File[] = await res.json();
      setFiles(data);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchFiles();
    }
  }, [status]);

  return (
    <Box>
      <Navbar />
      <Container
        maxWidth="lg"
        sx={{ p: { xs: 2, sm: 4 }, minHeight: "100vh", bgcolor: "grey.100" }}
        role="main"
        aria-label="Dashboard content"
      >
        <Typography variant="h4" fontWeight="bold" mb={3}>
          Dashboard
        </Typography>
        {error && (
          <Typography color="error" mb={2} aria-live="polite">
            {error}
          </Typography>
        )}
        <Box display="flex" flexDirection="column" gap={3} mb={4}>
          {status === "loading" && <CircularProgress />}
          <FolderCreate fetchFilesAction={fetchFiles} />
          <FormUpload files={files} fetchFilesAction={fetchFiles} />
        </Box>
        <FileList files={files} fetchFilesAction={fetchFiles} />
      </Container>
    </Box>
  );
}
