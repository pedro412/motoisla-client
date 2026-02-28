import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";

import type { AppNavItem } from "@/types/navigation";

export const privateNavItems: AppNavItem[] = [
  {
    key: "pos",
    label: "POS",
    href: "/pos",
    icon: <PointOfSaleRoundedIcon fontSize="small" />,
    module: "pos",
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
];
