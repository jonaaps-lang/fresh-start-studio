// Single import surface for the services layer.
// Routes/components must import from "@/services" — never from
// "@/integrations/supabase/client" directly.
export { customersService } from "./customers";
export type { CustomerLite } from "./customers";
export { suppliersService } from "./suppliers";
export { productsService } from "./products";
export type { ProductLite } from "./products";
export { quotesService } from "./quotes";
export type { QuoteWithCustomer } from "./quotes";
export { ordersService } from "./orders";
export type { OrderWithRefs } from "./orders";
export { companySettingsService } from "./company-settings";
export { settingsService } from "./settings";
export { storageService } from "./storage";
export { usersService } from "./users";
export type { ManagedUser } from "./users";
export { permissionsService } from "./permissions";
export type { MyPermissions } from "./permissions";
export { workflowService } from "./workflow";
export { productionService } from "./production";
export type { ProductionOrderRow, CreateProductionOrderInput } from "./production";
export { numberingService } from "./numbering";
export type { BuiltInNumberKind } from "./numbering";
export { financeService } from "./finance";
export type { TitleRow, CreateTitleInput } from "./finance";
export { purchasesService } from "./purchases";
export type { PurchaseRow, CreatePurchaseInput } from "./purchases";
export { stockService } from "./stock";
export type { StockMovementRow } from "./stock";
