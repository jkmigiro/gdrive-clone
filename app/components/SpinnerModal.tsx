import { green } from "@mui/material/colors";
import { CircularProgress, Backdrop, Typography } from "@mui/material";
export default function SpinnerModal({
  open,
  message,
}: {
  open: boolean;
  message: string;
}) {
  return (
    <Backdrop
      open={open}
      sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <CircularProgress
        size={68}
        sx={{
          color: green[500],
          zIndex: 1,
        }}
      />
      <Typography fontSize={24} ml={2} mt={2} color="success">
        {message}
      </Typography>
    </Backdrop>
  );
}
