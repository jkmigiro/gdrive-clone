"use client";

import React, { useState } from "react";
import File from "@/models/File";
import { LoadError, Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Image from "next/image";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

interface FilePreviewProps {
  file: File;
}

export default function FilePreview({ file }: FilePreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [pdfError, setPdfError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const fileUrl = `/files/${file._id}`;
  const isImage = file.mimeType?.startsWith("image/");
  const isPDF = file.mimeType === "application/pdf";

  const handleRenderError = (error: LoadError) => {
    setPdfError(error.message || "Failed to load PDF");
    setIsLoading(false);
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography color="error" aria-live="polite">
          {error.message || "Failed to load PDF"}
        </Typography>
      </Box>
    );
  };
  if (!file) return;
  return (
    <Box
      sx={{
        mt: 2,
        p: { xs: 2, sm: 3 },
        bgcolor: "grey.100",
        borderRadius: 2,
      }}
      role="region"
      aria-label={`Preview of ${file.name}`}
    >
      <Typography variant="h6" fontWeight="bold" mb={2}>
        Preview: {file.name}
      </Typography>
      {isLoading && (isImage || isPDF) && (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress aria-label="Loading preview" />
        </Box>
      )}
      {isImage && !imageError && (
        <Box sx={{ position: "relative", maxWidth: "100%", height: "auto" }}>
          <Image
            src={fileUrl}
            alt={file.name}
            width={800}
            height={600}
            style={{ width: "100%", height: "auto", maxHeight: "50vh" }}
            onError={() => {
              setImageError(true);
              setIsLoading(false);
            }}
            onLoad={() => setIsLoading(false)}
            aria-describedby="image-description"
          />
          <Typography
            id="image-description"
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            Image: {file.name}
          </Typography>
        </Box>
      )}
      {isImage && imageError && (
        <Typography color="error" mb={2} aria-live="polite">
          Failed to load image
        </Typography>
      )}
      {isPDF && !pdfError && (
        <Box
          sx={{
            height: { xs: "60vh", sm: "70vh" },
            maxHeight: { xs: 400, sm: 600 },
            border: "1px solid",
            borderColor: "grey.300",
            overflow: "auto",
          }}
        >
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer
              fileUrl={fileUrl}
              plugins={[defaultLayoutPluginInstance]}
              defaultScale={1.0}
              renderError={handleRenderError}
              onDocumentLoad={() => setIsLoading(false)}
            />
          </Worker>
        </Box>
      )}
      {isPDF && pdfError && (
        <Typography color="error" mb={2} aria-live="polite">
          {pdfError}
        </Typography>
      )}
      {!isImage && !isPDF && (
        <Box display="flex" flexDirection="column" gap={1}>
          <Typography>File Type: {file.mimeType || "Unknown"}</Typography>
          <Typography>
            Size: {file.size ? (file.size / 1024).toFixed(2) : "Unknown"} KB
          </Typography>
        </Box>
      )}
      <Button
        href={fileUrl}
        download={file.name}
        variant="contained"
        color="primary"
        sx={{
          mt: 2,
          textTransform: "none",
          px: 3,
          py: 1,
        }}
        aria-label={`Download ${isPDF ? "PDF" : isImage ? "image" : "file"} ${file.name}`}
      >
        Download {isPDF ? "PDF" : isImage ? "Image" : "File"}
      </Button>
    </Box>
  );
}
