// app/dashboard/page.tsx
"use client";
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/utils/auth';
// import { redirect } from 'next/navigation';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FileList from "../components/FileList";
import FormUpload from "../components/forms/FormUpload";
import FolderCreate from "../components/FolderCreate";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [files, setFiles] = useState<any[]>([]);
  const [error, setError] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch files
  const fetchFiles = async () => {
    try {
      const res = await fetch("/files");

      if (!res.ok) throw new Error("Failed to fetch files");
      const data = await res.json();
      setFiles(data);
      setError("");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    }
  };
  // Initial fetch
  useEffect(() => {
    console.log("Status: ", status);
    if (status === "authenticated") {
      fetchFiles();
    }
  }, [status]);

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="flex gap-4 mb-6">
        <FolderCreate />
        <FormUpload />
      </div>
      <FileList uploadedFiles={files} />
    </div>
  );
}
