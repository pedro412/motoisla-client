import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";

import type { AppNavItem } from "@/types/navigation";

export const privateNavItems: AppNavItem[] = [
  {
    key: "pos",
    label: "Nueva Venta",
    href: "/pos",
    icon: <PointOfSaleRoundedIcon fontSize="small" />,
    module: "pos",
    requiredRoles: ["ADMIN", "CASHIER"],
  },
  {
    key: "sales",
    label: "Ventas",
    href: "/ventas",
    icon: <ReceiptLongRoundedIcon fontSize="small" />,
    module: "sales",
    requiredRoles: ["ADMIN", "CASHIER"],
  },
  {
    key: "layaway",
    label: "Apartados",
    href: "/apartados",
    icon: <EventNoteRoundedIcon fontSize="small" />,
    module: "layaway",
    requiredRoles: ["ADMIN", "CASHIER"],
  },
  {
    key: "purchases",
    label: "Compras",
    href: "/purchases",
    icon: <LocalShippingRoundedIcon fontSize="small" />,
    module: "purchases",
    requiredRoles: ["ADMIN", "CASHIER"],
  },
  {
    key: "products",
    label: "Productos",
    href: "/products",
    icon: <Inventory2RoundedIcon fontSize="small" />,
    module: "products",
    requiredRoles: ["ADMIN", "CASHIER"],
  },
  {
    key: "reports",
    label: "Admin Reports",
    href: "/admin/reports",
    icon: <AssessmentRoundedIcon fontSize="small" />,
    module: "reports",
    requiredRoles: ["ADMIN"],
  },
  {
    key: "investors",
    label: "Inversionistas",
    href: "/investors",
    icon: <AccountBalanceWalletRoundedIcon fontSize="small" />,
    module: "investors",
    requiredRoles: ["ADMIN"],
  },
];
