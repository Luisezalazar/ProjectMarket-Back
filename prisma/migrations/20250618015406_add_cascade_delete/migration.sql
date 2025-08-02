-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ItemOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quantity" INTEGER NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    CONSTRAINT "ItemOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ItemOrder" ("id", "orderId", "productId", "quantity", "subtotal") SELECT "id", "orderId", "productId", "quantity", "subtotal" FROM "ItemOrder";
DROP TABLE "ItemOrder";
ALTER TABLE "new_ItemOrder" RENAME TO "ItemOrder";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
