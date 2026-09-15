# 🪙 Kamael Finance

> Sistema completo e inteligente de gestão financeira pessoal e empresarial focado em liquidez de caixa, controle de cartões de crédito, central de boletos e assinaturas, radar de pequenos gastos e planejamento orçamentário de viagens.

---

## 📸 Demonstração

*(Adicione aqui uma captura de tela ou GIF demonstrando o dashboard em ação)*

```text
+-----------------------------------------------------------------------------------+
|  🪙 KAMAEL FINANCE                                          [Túlio Cavalcanti]    |
+-----------------------------------------------------------------------------------+
|  [Saldo Consolidado]   [Projeção de Caixa]   [Faturas Abertas]   [Contas a Pagar] |
|     R$ 14.850,00           R$ 9.420,00          R$ 2.340,00         R$ 1.890,00   |
+-----------------------------------------------------------------------------------+
|  📈 Gráfico de Fluxo de Caixa Mensal    |  💳 Distribuição por Meio de Pagamento  |
|  [Receitas x Despesas x Investimentos]  |  [Nubank | Santander | C6 | Ticket VR]  |
+-----------------------------------------------------------------------------------+
```

---

## 🚀 Principais Funcionalidades

- 📊 **Visão Geral e Projeção de Caixa:**
  - Saldo consolidado em tempo real de todas as contas bancárias, carteiras e investimentos.
  - Cálculo inteligente de *Saldo Pós-Contas* projetado até o fechamento do mês, antecipando faturas e despesas fixas.

- 🏦 **Gestão de Contas Correntes & Liquidez:**
  - Extrato financeiro unificado e objetivo, sem categorias miúdas desnecessárias.
  - Injeção e retirada de capital por data exata com histórico de conciliação.

- 💳 **Controle Avançado de Cartões de Crédito:**
  - Monitoramento de limites totais, limites utilizados e disponíveis por cartão.
  - Acompanhamento visual de faturas abertas, datas de fechamento e de vencimento.
  - Gestão e simulação de compras parceladas com impacto futuro no fluxo de caixa.

- 📄 **Central de Boletos, Contas Fixas & Assinaturas:**
  - Agendamento de despesas recorrentes e compromissos mensais.
  - Baixa automatizada com débito instantâneo no saldo bancário ou lançamento na fatura do cartão.

- 🔍 **Radar de Pequenos Gastos (Micro-Vazamentos):**
  - Identificação visual e projeção acumulada de compras diárias de baixo valor, contendo vazamentos invisíveis no orçamento.

- ✈️ **Planejamento de Viagens & Eventos:**
  - Orçamento detalhado com cálculo de *Custo Projetado* ($\text{Total Já Pago} + \text{Pendente Estimado}$) e cálculo de economia frente ao teto máximo.
  - Termômetro visual de progresso financeiro do orçamento.
  - Agrupamento automático por categorias temáticas (🏨 Hospedagem, 🚌 Transporte, 🎟️ Ingressos/Eventos, 🍔 Gastos no Local, 🎒 Outros).
  - Lançamento de despesas integrado com débito automático no saldo de contas bancárias.
  - Checklist interativo dividido em 2 colunas: *Antes de Sair / Mala & Documentos* vs. *Roteiro / Programação & Horários*.

- 🎯 **Metas Financeiras & Cofrinhos:**
  - Acompanhamento de objetivos e reservas financeiras com percentual de atingimento e histórico de aportes.

- 📥 **Reconciliação Bancária:**
  - Importação de arquivos bancários em formato OFX para conciliação ágil de lançamentos.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi desenvolvido utilizando as tecnologias mais modernas do ecossistema React/Next.js:

- **Framework:** [Next.js](https://nextjs.org/) (App Router, Server Actions, Server Components)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Biblioteca Base:** [React](https://react.dev/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Banco de Dados & ORM:** [Prisma ORM](https://www.prisma.io/) com banco de dados PostgreSQL
- **Componentes & Ícones:** [Lucide React](https://lucide.dev/)
- **Visualização de Dados:** [Recharts](https://recharts.org/)
- **Validação de Schemas:** [Zod](https://zod.dev/)

---

## 💻 Como Executar o Projeto Localmente

### Pré-requisitos

Certifique-se de ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- Gerenciador de pacotes `npm`, `yarn` ou `pnpm`
- Banco de dados PostgreSQL (local ou serviço na nuvem como Supabase ou Neon)

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/Tulhinho007/KamaelFinance.git
   ```

2. **Acesse a pasta do projeto:**
   ```bash
   cd KamaelFinance
   ```

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto e configure as URLs de conexão:
   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/kamael_finance"
   DIRECT_URL="postgresql://usuario:senha@localhost:5432/kamael_finance"
   ```

5. **Gere os clientes do Prisma:**
   ```bash
   npx prisma generate
   ```

6. **Inicie o servidor local de desenvolvimento:**
   ```bash
   npm run dev
   ```

7. **Acesse no navegador:**
   Abra [http://localhost:3001](http://localhost:3001) (ou a porta indicada pelo terminal) para utilizar o sistema.

---

## 👤 Autor

Desenvolvido por **Túlio Cavalcanti**.

- **GitHub:** [@Tulhinho007](https://github.com/Tulhinho007)

---

## 📄 Licença

Este projeto é de uso pessoal e privado. Todos os direitos reservados.
