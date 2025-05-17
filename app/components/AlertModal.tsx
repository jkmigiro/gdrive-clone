import {
  Dialog,
  DialogContent,
  DialogActions,
  Alert,
  Button,
} from "@mui/material";

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  message: string;
  severity?: "error" | "warning" | "info" | "success";
}

export default function AlertModal({
  open,
  onClose,
  message,
  severity,
}: AlertModalProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <Alert severity={severity}>{message}</Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
