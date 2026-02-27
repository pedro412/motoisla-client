import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";

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
    key: "reports",
    label: "Admin Reports",
    href: "/admin/reports",
    icon: <AssessmentRoundedIcon fontSize="small" />,
    module: "reports",
    requiredRoles: ["ADMIN"],
  },
];
