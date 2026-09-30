-- CreateTable
CREATE TABLE "Candidato" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "nomeUrna" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "partido" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Candidato_cargo_numero_key" ON "Candidato"("cargo", "numero");
