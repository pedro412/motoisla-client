"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

interface ProductDeleteDialogProps {
  open: boolean;
  productName: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ProductDeleteDialog({ open, productName, loading = false, onClose, onConfirm }: ProductDeleteDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Confirmar borrado</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {`Vas a borrar ${productName || "este producto"}. El producto dejará de aparecer como activo, las compras e historial seguirán intactos y esta acción no se puede deshacer desde esta interfaz.`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={loading}>
          Borrar producto
        </Button>
      </DialogActions>
    </Dialog>
  );
}
