"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
export default function FolderCreate() {
  const [name, setName] = useState<string>("");
  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    let response;
    try {
      response = await axios.post("/files/folders", {
        name: name,
      });

      if (response && response.status === 200) {
        alert("Folder created");
        setName("");
        router.push("/dashboard");
      } else {
        console.log("Error when creating folder: ", response);
        alert("Folder creation failed");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.log("Error occurred when creating a folder: ", err);
    }

    // const res = await fetch("/files/folders", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ name }),
    // });

    // if (res.ok) {
    //   console.log("Response after creating folder: ", res);
    //   alert("Folder created");
    //   setName("");
    // } else {
    //   console.log("Response after creating folder: ", res);
    //   alert("Folder creation failed");
    // }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Folder name"
        className="p-2 border rounded"
      />
      <button type="submit" className="p-2 bg-green-500 text-white rounded">
        Create Folder
      </button>
    </form>
  );
}
