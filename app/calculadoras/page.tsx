import { Metadata } from "next";
import { FinancialHub } from "@/components/financial-hub";

export const metadata: Metadata = {
  title: "Central de Calculadoras Financeiras | Kamael Finance",
  description: "Simuladores matemáticos de juros compostos, reserva de emergência, amortização acelerada de dívidas e comparador à vista vs parcelado.",
};

export default function CalculadorasPage() {
  return <FinancialHub />;
}
