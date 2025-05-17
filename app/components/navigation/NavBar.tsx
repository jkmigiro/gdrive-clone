"use client";

import React, { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut({ redirect: false });
      router.push("/api/auth/signin");
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppBar position="static" role="navigation" aria-label="Main navigation">
      <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, fontWeight: "bold" }}
        >
          <Link
            href={session ? "/dashboard" : "/"}
            color="inherit"
            underline="none"
            aria-label="Google Drive Clone home"
          >
            Google Drive Clone
          </Link>
        </Typography>
        {status === "loading" && (
          <CircularProgress
            size={24}
            color="inherit"
            aria-label="Loading session"
          />
        )}
        {status === "authenticated" && (
          <Button
            color="inherit"
            onClick={handleSignOut}
            disabled={isLoading}
            sx={{ textTransform: "none", px: 3, py: 1 }}
            aria-label="Sign out"
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Sign Out"
            )}
          </Button>
        )}
        {status === "unauthenticated" && (
          <Button
            color="inherit"
            href="/api/auth/signin"
            sx={{ textTransform: "none", px: 3, py: 1 }}
            aria-label="Sign in"
          >
            Sign In
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
