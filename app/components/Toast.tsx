import { Snackbar } from "@mui/material";
export default function Toast({
  open,
  message,
}: {
  open: boolean;
  message: string;
}) {
  return (
    <>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={open}
        autoHideDuration={3000}
        message={message}
      />
    </>
  );
}
