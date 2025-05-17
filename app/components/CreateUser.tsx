"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "next/link";

export default function CreateUser() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error === "Email already exists"
            ? "Email already exists"
            : data.error || "Failed to create user",
        );
      }

      router.push("/api/auth/signin");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress aria-label="Loading signup page" />
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ bgcolor: "grey.100", p: { xs: 2, sm: 3 } }}
    >
      <Box
        sx={{
          p: { xs: 3, sm: 4 },
          bgcolor: "white",
          borderRadius: 2,
          boxShadow: 3,
          width: "100%",
          maxWidth: 400,
        }}
        role="form"
        aria-label="Sign up form"
      >
        <Typography variant="h5" fontWeight="bold" mb={3} textAlign="center">
          Create Account
        </Typography>
        {error && (
          <Typography color="error" mb={2} aria-live="polite">
            {error}
          </Typography>
        )}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            margin="normal"
            placeholder="you@example.com"
            slotProps={{
              inputLabel: { htmlFor: "email" },
              input: { id: "email" },
            }}
            aria-required="true"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            margin="normal"
            placeholder="••••••••"
            slotProps={{
              inputLabel: { htmlFor: "password" },
              input: { id: "password" },
            }}
            aria-required="true"
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={isLoading}
            sx={{ mt: 2, py: 1.5, textTransform: "none" }}
            aria-label="Create account"
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
        <Typography variant="body2" mt={2} textAlign="center">
          Already have an account?{" "}
          <Link
            href="/api/auth/signin"
            className="text-blue-600 hover:underline"
          >
            Sign In
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
