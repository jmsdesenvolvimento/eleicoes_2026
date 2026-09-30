-- CreateTable
CREATE TABLE "LancamentoVoto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "candidatoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LancamentoVoto_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LancamentoVoto_candidatoId_idx" ON "LancamentoVoto"("candidatoId");
