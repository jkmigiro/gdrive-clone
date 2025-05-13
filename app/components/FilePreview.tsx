"use client";

import File from "@/models/File";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Image from "next/image";

interface FilePreviewProps {
  file: File;
}

export default function FilePreview({ file }: FilePreviewProps) {
  if (!file) return null;

  const isImage = file.mimeType?.startsWith("image/");
  const isPDF = file.mimeType === "application/pdf";
  const fileUrl = `/files/${file._id}`;
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded">
      <h3 className="text-lg font-bold">Preview: {file.name}</h3>
      {isImage && (
        <Image
          src={fileUrl}
          alt={file.name}
          className="max-w-full h-auto mt-2"
        />
      )}
      {isPDF && (
        <div className="mt-2 h-[600px] border">
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer
              fileUrl={fileUrl}
              plugins={[defaultLayoutPluginInstance]}
              defaultScale={1.0}
            />
          </Worker>
        </div>
      )}
      {!isImage && !isPDF && (
        <div className="mt-2">
          <p>File Type: {file.mimeType || "Unknown"}</p>
          <p>Size: {(file.size! / 1024).toFixed(2)} KB</p>
          <p>
            <a
              href={fileUrl}
              download={file.name}
              className="text-blue-500 hover:underline"
            >
              Download File
            </a>
          </p>
        </div>
      )}
      {(isImage || isPDF) && (
        <p className="mt-2">
          <a
            href={fileUrl}
            download={file.name}
            className="text-blue-500 hover:underline"
          >
            Download {isPDF ? "PDF" : "Image"}
          </a>
        </p>
      )}
    </div>
  );
}
